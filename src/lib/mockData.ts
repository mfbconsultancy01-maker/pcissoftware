// ============================================================
// PCIS P1 — Mock Data Layer
// Maps directly to P1 backend engine outputs.
// One flag (USE_LIVE_API) to switch to real API calls later.
// ============================================================

export const USE_LIVE_API = true

// ============================================================
// TYPES
// ============================================================

export interface Client {
  id: string
  name: string
  initials: string
  type: 'UHNW' | 'HNW' | 'Affluent'
  category: 'Trophy Buyer' | 'Investor' | 'Lifestyle' | 'Portfolio Builder'
  email: string
  phone: string
  location: string
  onboardedAt: string
  financialProfile: {
    budgetMin: number
    budgetMax: number
    portfolioValue: number
    currency: string
  }
  dealStage: DealStage
  dealStageChangedAt: string
}

export interface CognitiveScore {
  dimension: string
  value: number        // 0-100
  confidence: number   // 0-1
  trend: 'rising' | 'falling' | 'stable'
}

export interface CognitiveProfile {
  clientId: string
  scores: CognitiveScore[]
  summary: string
  keyTraits: string[]
  approachStrategy: string
  riskFactors: string[]
  communicationTips: string[]
  lastComputed: string
}

export type EngagementStatus = 'thriving' | 'active' | 'cooling' | 'cold' | 'dormant'
export type MomentumDirection = 'heating' | 'cooling' | 'stable'

export interface EngagementMetrics {
  clientId: string
  status: EngagementStatus
  momentum: MomentumDirection
  currentVelocity: number    // signals per week
  baselineVelocity: number
  decayRate: number          // percentage drop
  daysSinceContact: number
  expectedInterval: number   // days
  engagementScore: number    // 0-100
  readinessScore: number     // 0-1
}

export type PredictionPattern =
  | 'Imminent Purchase'
  | 'Analysis Paralysis'
  | 'Price Negotiation'
  | 'Trust Erosion'
  | 'Portfolio Expansion'
  | 'Flight Risk'
  | 'Upsell Opportunity'

export interface Prediction {
  clientId: string
  pattern: PredictionPattern
  confidence: number    // 0-100
  momentum: MomentumDirection
  description: string
  detectedAt: string
}

export interface Relationship {
  id: string
  fromClientId: string
  toClientId: string
  type: 'Spouse' | 'Business Partner' | 'Referral' | 'Family' | 'Associate'
  influenceStrength: number  // 0-1
  cognitiveAlignment: number // 0-1
  direction: 'bidirectional' | 'one-way'
}

export interface LifecycleData {
  clientId: string
  lifeStage: string
  portfolioMaturity: string
  nextLikelyAction: string
  upcomingEvents: string[]
  seasonalPatterns: string[]
}

export interface Signal {
  id: string
  clientId: string
  type: 'viewing' | 'inquiry' | 'meeting' | 'offer' | 'feedback' | 'referral' | 'financial' | 'lifecycle'
  content: string
  timestamp: string
  impact: { dimension: string; delta: number }[]
}

export interface Property {
  id: string
  name: string
  area: string
  bedrooms: number
  price: number
  currency: string
  type: 'Villa' | 'Penthouse' | 'Apartment' | 'Estate' | 'Townhouse'
  features: string[]
}

export interface Match {
  id: string
  clientId: string
  propertyId: string
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D'
  overallScore: number  // 0-1
  pillars: {
    clientFit: number
    financial: number
    value: number
    timing: number
  }
  aiIntelligence: string
  createdAt: string
}

export type RecommendationUrgency = 'Act' | 'Monitor' | 'Prepare'
export type RecommendationCategory = 'Property' | 'Market' | 'Portfolio' | 'Relationship'

export interface Recommendation {
  id: string
  clientId: string
  urgency: RecommendationUrgency
  category: RecommendationCategory
  title: string
  description: string
  createdAt: string
  matchId?: string
  propertyId?: string
  timeframe: string
  expectedOutcome: string
  confidence: number
  impact: 'High' | 'Medium' | 'Low'
  relatedReportId?: string
  whyNow: string
  clientContext: string
  nextSteps: string
}

export interface AdvisorPerformance {
  flyWheelScore: number
  signalsFed: number
  actionsTaken: number
  matchesPresented: number
  reportsGenerated: number
  recommendationsActedOn: number
  recommendationsTotal: number
  alertsAcknowledged: number
  alertsTotal: number
  conversionRate: number
  weeklyTrend: number[]
}

// ============================================================
// DEAL PIPELINE
// ============================================================

export type DealStage = 'Lead In' | 'Discovery' | 'Viewing' | 'Offer Made' | 'Negotiation' | 'Closed Won'

export const DEAL_STAGES: DealStage[] = ['Lead In', 'Discovery', 'Viewing', 'Offer Made', 'Negotiation', 'Closed Won']

export const dealStageColors: Record<DealStage, string> = {
  'Lead In': '#6b7280',
  'Discovery': '#06b6d4',
  'Viewing': '#3b82f6',
  'Offer Made': '#a78bfa',
  'Negotiation': '#f59e0b',
  'Closed Won': '#22c55e',
}

// ============================================================
// ACTIVITY RECORDS — unified interaction history
// ============================================================

export type ActivityType = 'call' | 'email' | 'meeting' | 'note' | 'document' | 'signal'

export interface ActivityRecord {
  id: string
  clientId: string
  type: ActivityType
  title: string
  content: string
  timestamp: string
  duration?: number       // minutes, for calls/meetings
  outcome?: 'positive' | 'neutral' | 'negative'
  attendees?: string[]
}

// ============================================================
// NEXT TOUCH — follow-up scheduling
// ============================================================

export interface NextTouch {
  clientId: string
  date: string            // ISO date
  reason: string
  type: 'call' | 'email' | 'meeting' | 'viewing'
}

// ============================================================
// CLIENT NOTES — advisor journal
// ============================================================

export interface ClientNote {
  id: string
  clientId: string
  timestamp: string
  content: string
  tags: string[]
  isPinned: boolean
}

// ============================================================
// CLIENTS — 24 realistic luxury real estate clients
// ============================================================

export const clients: Client[] = [
  { id: 'c1', name: 'Ahmed Al Maktoum', initials: 'AM', type: 'UHNW', category: 'Trophy Buyer', email: 'ahmed@almaktoum.ae', phone: '+971 50 XXX 0001', location: 'Dubai, UAE', onboardedAt: '2025-09-15', financialProfile: { budgetMin: 150_000_000, budgetMax: 250_000_000, portfolioValue: 890_000_000, currency: 'AED' }, dealStage: 'Offer Made', dealStageChangedAt: '2026-03-01T10:00:00Z' },
  { id: 'c2', name: 'Chen Wei', initials: 'CW', type: 'UHNW', category: 'Investor', email: 'chen.wei@outlook.com', phone: '+86 138 XXXX 0002', location: 'Shanghai, China', onboardedAt: '2025-10-01', financialProfile: { budgetMin: 80_000_000, budgetMax: 150_000_000, portfolioValue: 620_000_000, currency: 'AED' }, dealStage: 'Discovery', dealStageChangedAt: '2026-02-25T14:00:00Z' },
  { id: 'c3', name: 'Elena Petrova', initials: 'EP', type: 'HNW', category: 'Lifestyle', email: 'elena.p@mail.ru', phone: '+7 916 XXX 0003', location: 'Moscow, Russia', onboardedAt: '2025-08-20', financialProfile: { budgetMin: 25_000_000, budgetMax: 50_000_000, portfolioValue: 180_000_000, currency: 'AED' }, dealStage: 'Viewing', dealStageChangedAt: '2026-02-10T09:00:00Z' },
  { id: 'c4', name: 'James O\'Brien', initials: 'JO', type: 'HNW', category: 'Portfolio Builder', email: 'jobrien@gmail.com', phone: '+44 7700 XXX 004', location: 'London, UK', onboardedAt: '2025-11-10', financialProfile: { budgetMin: 15_000_000, budgetMax: 35_000_000, portfolioValue: 95_000_000, currency: 'AED' }, dealStage: 'Viewing', dealStageChangedAt: '2026-02-28T11:00:00Z' },
  { id: 'c5', name: 'Yuki Yamamoto', initials: 'YY', type: 'UHNW', category: 'Investor', email: 'yuki@yamamoto.jp', phone: '+81 90 XXXX 0005', location: 'Tokyo, Japan', onboardedAt: '2025-07-05', financialProfile: { budgetMin: 60_000_000, budgetMax: 120_000_000, portfolioValue: 450_000_000, currency: 'AED' }, dealStage: 'Discovery', dealStageChangedAt: '2026-02-20T16:00:00Z' },
  { id: 'c6', name: 'Sophie Van der Berg', initials: 'SV', type: 'HNW', category: 'Lifestyle', email: 'sophie.vdb@icloud.com', phone: '+31 6 XXXX 0006', location: 'Amsterdam, Netherlands', onboardedAt: '2025-10-20', financialProfile: { budgetMin: 20_000_000, budgetMax: 45_000_000, portfolioValue: 120_000_000, currency: 'AED' }, dealStage: 'Offer Made', dealStageChangedAt: '2026-03-02T08:00:00Z' },
  { id: 'c7', name: 'Marc Dubois', initials: 'MD', type: 'UHNW', category: 'Trophy Buyer', email: 'marc@dubois-group.fr', phone: '+33 6 XXXX 0007', location: 'Paris, France', onboardedAt: '2025-06-15', financialProfile: { budgetMin: 100_000_000, budgetMax: 200_000_000, portfolioValue: 750_000_000, currency: 'AED' }, dealStage: 'Negotiation', dealStageChangedAt: '2026-02-22T15:00:00Z' },
  { id: 'c8', name: 'Khalid Al Rashid', initials: 'KR', type: 'HNW', category: 'Investor', email: 'khalid.r@gmail.com', phone: '+966 55 XXX 0008', location: 'Riyadh, Saudi Arabia', onboardedAt: '2025-09-01', financialProfile: { budgetMin: 30_000_000, budgetMax: 70_000_000, portfolioValue: 280_000_000, currency: 'AED' }, dealStage: 'Viewing', dealStageChangedAt: '2026-02-26T10:00:00Z' },
  { id: 'c9', name: 'Klaus Schmidt', initials: 'KS', type: 'HNW', category: 'Portfolio Builder', email: 'k.schmidt@web.de', phone: '+49 170 XXX 0009', location: 'Munich, Germany', onboardedAt: '2025-11-25', financialProfile: { budgetMin: 10_000_000, budgetMax: 25_000_000, portfolioValue: 65_000_000, currency: 'AED' }, dealStage: 'Discovery', dealStageChangedAt: '2026-02-18T14:00:00Z' },
  { id: 'c10', name: 'Isabella Moretti', initials: 'IM', type: 'HNW', category: 'Lifestyle', email: 'isabella.m@outlook.it', phone: '+39 340 XXX 0010', location: 'Milan, Italy', onboardedAt: '2025-08-10', financialProfile: { budgetMin: 15_000_000, budgetMax: 40_000_000, portfolioValue: 110_000_000, currency: 'AED' }, dealStage: 'Offer Made', dealStageChangedAt: '2026-03-01T12:00:00Z' },
  { id: 'c11', name: 'David Kim', initials: 'DK', type: 'UHNW', category: 'Investor', email: 'david.kim@samsung.kr', phone: '+82 10 XXXX 0011', location: 'Seoul, South Korea', onboardedAt: '2025-07-20', financialProfile: { budgetMin: 50_000_000, budgetMax: 100_000_000, portfolioValue: 520_000_000, currency: 'AED' }, dealStage: 'Negotiation', dealStageChangedAt: '2026-03-03T15:00:00Z' },
  { id: 'c12', name: 'Priya Patel', initials: 'PP', type: 'HNW', category: 'Portfolio Builder', email: 'priya.p@gmail.com', phone: '+91 98 XXXX 0012', location: 'Mumbai, India', onboardedAt: '2025-10-15', financialProfile: { budgetMin: 20_000_000, budgetMax: 50_000_000, portfolioValue: 160_000_000, currency: 'AED' }, dealStage: 'Viewing', dealStageChangedAt: '2026-02-24T09:00:00Z' },
  { id: 'c13', name: 'Lucas Santos', initials: 'LS', type: 'HNW', category: 'Lifestyle', email: 'lucas.santos@uol.com.br', phone: '+55 11 XXXX 0013', location: 'São Paulo, Brazil', onboardedAt: '2025-09-30', financialProfile: { budgetMin: 12_000_000, budgetMax: 30_000_000, portfolioValue: 85_000_000, currency: 'AED' }, dealStage: 'Discovery', dealStageChangedAt: '2026-02-15T11:00:00Z' },
  { id: 'c14', name: 'Emma Williams', initials: 'EW', type: 'HNW', category: 'Investor', email: 'emma.w@proton.me', phone: '+1 212 XXX 0014', location: 'New York, USA', onboardedAt: '2025-11-05', financialProfile: { budgetMin: 25_000_000, budgetMax: 60_000_000, portfolioValue: 200_000_000, currency: 'AED' }, dealStage: 'Discovery', dealStageChangedAt: '2026-02-20T10:00:00Z' },
  { id: 'c15', name: 'Erik Johansson', initials: 'EJ', type: 'HNW', category: 'Portfolio Builder', email: 'erik.j@telia.se', phone: '+46 70 XXX 0015', location: 'Stockholm, Sweden', onboardedAt: '2025-08-25', financialProfile: { budgetMin: 18_000_000, budgetMax: 40_000_000, portfolioValue: 130_000_000, currency: 'AED' }, dealStage: 'Lead In', dealStageChangedAt: '2026-02-12T08:00:00Z' },
  { id: 'c16', name: 'Takeshi Nakamura', initials: 'TN', type: 'UHNW', category: 'Trophy Buyer', email: 'takeshi@nakamura.co.jp', phone: '+81 80 XXXX 0016', location: 'Osaka, Japan', onboardedAt: '2025-06-01', financialProfile: { budgetMin: 90_000_000, budgetMax: 180_000_000, portfolioValue: 680_000_000, currency: 'AED' }, dealStage: 'Closed Won', dealStageChangedAt: '2026-02-28T16:00:00Z' },
  { id: 'c17', name: 'Maria Garcia', initials: 'MG', type: 'HNW', category: 'Lifestyle', email: 'maria.g@icloud.com', phone: '+34 610 XXX 017', location: 'Madrid, Spain', onboardedAt: '2025-10-08', financialProfile: { budgetMin: 10_000_000, budgetMax: 25_000_000, portfolioValue: 70_000_000, currency: 'AED' }, dealStage: 'Lead In', dealStageChangedAt: '2026-02-05T10:00:00Z' },
  { id: 'c18', name: 'Sergei Ivanov', initials: 'SI', type: 'HNW', category: 'Investor', email: 'sivanov@yandex.ru', phone: '+7 926 XXX 0018', location: 'St. Petersburg, Russia', onboardedAt: '2025-09-18', financialProfile: { budgetMin: 20_000_000, budgetMax: 45_000_000, portfolioValue: 150_000_000, currency: 'AED' }, dealStage: 'Lead In', dealStageChangedAt: '2026-02-08T14:00:00Z' },
  { id: 'c19', name: 'Thomas Brown', initials: 'TB', type: 'Affluent', category: 'Lifestyle', email: 'tbrown@gmail.com', phone: '+61 4XX XXX 019', location: 'Sydney, Australia', onboardedAt: '2025-11-20', financialProfile: { budgetMin: 5_000_000, budgetMax: 15_000_000, portfolioValue: 35_000_000, currency: 'AED' }, dealStage: 'Lead In', dealStageChangedAt: '2026-01-25T09:00:00Z' },
  { id: 'c20', name: 'Ji-Yeon Lee', initials: 'JL', type: 'HNW', category: 'Portfolio Builder', email: 'jiyeon.lee@naver.com', phone: '+82 10 XXXX 0020', location: 'Seoul, South Korea', onboardedAt: '2025-08-05', financialProfile: { budgetMin: 15_000_000, budgetMax: 35_000_000, portfolioValue: 95_000_000, currency: 'AED' }, dealStage: 'Viewing', dealStageChangedAt: '2026-02-22T11:00:00Z' },
  { id: 'c21', name: 'Hans Müller', initials: 'HM', type: 'HNW', category: 'Investor', email: 'hans.muller@gmx.de', phone: '+49 151 XXX 0021', location: 'Zurich, Switzerland', onboardedAt: '2025-07-10', financialProfile: { budgetMin: 25_000_000, budgetMax: 55_000_000, portfolioValue: 175_000_000, currency: 'AED' }, dealStage: 'Discovery', dealStageChangedAt: '2026-01-20T15:00:00Z' },
  { id: 'c22', name: 'Sean Fitzgerald', initials: 'SF', type: 'Affluent', category: 'Lifestyle', email: 'sean.f@outlook.ie', phone: '+353 87 XXX 0022', location: 'Dublin, Ireland', onboardedAt: '2025-10-28', financialProfile: { budgetMin: 5_000_000, budgetMax: 12_000_000, portfolioValue: 28_000_000, currency: 'AED' }, dealStage: 'Lead In', dealStageChangedAt: '2026-01-28T10:00:00Z' },
  { id: 'c23', name: 'Dmitri Volkov', initials: 'DV', type: 'HNW', category: 'Investor', email: 'dvolkov@mail.ru', phone: '+7 903 XXX 0023', location: 'Moscow, Russia', onboardedAt: '2025-05-15', financialProfile: { budgetMin: 30_000_000, budgetMax: 70_000_000, portfolioValue: 240_000_000, currency: 'AED' }, dealStage: 'Lead In', dealStageChangedAt: '2026-01-10T08:00:00Z' },
  { id: 'c24', name: 'Fatima Ahmed', initials: 'FA', type: 'Affluent', category: 'Lifestyle', email: 'fatima.a@gmail.com', phone: '+971 55 XXX 0024', location: 'Abu Dhabi, UAE', onboardedAt: '2025-12-01', financialProfile: { budgetMin: 3_000_000, budgetMax: 8_000_000, portfolioValue: 18_000_000, currency: 'AED' }, dealStage: 'Lead In', dealStageChangedAt: '2025-12-15T14:00:00Z' },
]

// ============================================================
// COGNITIVE PROFILES
// ============================================================

const cognitiveDimensions = [
  'Trust Formation', 'Risk Tolerance', 'Decision Velocity', 'Price Sensitivity',
  'Status Orientation', 'Privacy Need', 'Detail Orientation', 'Emotional Driver',
  'Negotiation Style', 'Loyalty Tendency', 'Innovation Appetite', 'Social Proof Need',
]

function generateCognitiveProfile(clientId: string, archetype: 'decisive' | 'analytical' | 'cautious' | 'impulsive' | 'balanced'): CognitiveProfile {
  const archetypes: Record<string, number[]> = {
    decisive:   [75, 70, 90, 35, 85, 60, 50, 65, 80, 70, 65, 40],
    analytical: [65, 45, 35, 75, 40, 70, 95, 30, 60, 80, 55, 45],
    cautious:   [40, 25, 25, 85, 30, 90, 80, 45, 40, 85, 25, 70],
    impulsive:  [55, 80, 95, 20, 90, 30, 25, 85, 70, 35, 80, 60],
    balanced:   [65, 55, 60, 55, 55, 55, 60, 55, 55, 65, 55, 55],
  }
  const base = archetypes[archetype]
  const trends: Array<'rising' | 'falling' | 'stable'> = ['rising', 'falling', 'stable']

  const scores: CognitiveScore[] = cognitiveDimensions.map((dim, i) => ({
    dimension: dim,
    value: Math.min(100, Math.max(0, base[i] + Math.floor(Math.random() * 16 - 8))),
    confidence: parseFloat((0.6 + Math.random() * 0.35).toFixed(2)),
    trend: trends[Math.floor(Math.random() * 3)],
  }))

  const summaries: Record<string, string> = {
    decisive: 'Fast decision-maker with strong status orientation. Responds well to exclusivity framing and direct presentations. Low price sensitivity — focus on value proposition over cost.',
    analytical: 'Data-driven buyer who needs comprehensive analysis before committing. High detail orientation means thorough due diligence is expected. Patient approach with ROI-focused messaging.',
    cautious: 'Risk-averse client requiring significant trust-building before progressing. Values privacy and stability. Needs social proof and reassurance at each stage.',
    impulsive: 'Emotionally driven with high risk tolerance and fast decision velocity. Responds to urgency and exclusivity. Status-conscious — frame properties as lifestyle upgrades.',
    balanced: 'Well-rounded decision profile with moderate scores across all dimensions. Flexible approach strategy — mirror their energy and adjust based on signal feedback.',
  }

  const traitSets: Record<string, string[]> = {
    decisive: ['Decisive', 'Status Driven', 'Low Price Sensitivity', 'Direct Communicator'],
    analytical: ['Analytical', 'Detail Oriented', 'ROI Focused', 'Patient Buyer'],
    cautious: ['Risk Averse', 'Privacy Conscious', 'Trust Dependent', 'Loyal Once Won'],
    impulsive: ['Emotionally Driven', 'Status Conscious', 'Fast Mover', 'Experience Seeker'],
    balanced: ['Adaptable', 'Moderate Risk', 'Open Minded', 'Relationship Oriented'],
  }

  return {
    clientId,
    scores,
    summary: summaries[archetype],
    keyTraits: traitSets[archetype],
    approachStrategy: `${archetype.charAt(0).toUpperCase() + archetype.slice(1)} archetype — tailor presentations accordingly.`,
    riskFactors: archetype === 'cautious' ? ['May stall without trust signals', 'Competitor risk if not nurtured'] : ['Standard monitoring'],
    communicationTips: [`Best engaged via ${archetype === 'analytical' ? 'detailed reports and data' : archetype === 'decisive' ? 'concise presentations' : 'relationship-first approach'}`],
    lastComputed: '2026-03-02T18:00:00Z',
  }
}

export const cognitiveProfiles: CognitiveProfile[] = [
  generateCognitiveProfile('c1', 'decisive'),
  generateCognitiveProfile('c2', 'analytical'),
  generateCognitiveProfile('c3', 'cautious'),
  generateCognitiveProfile('c4', 'balanced'),
  generateCognitiveProfile('c5', 'analytical'),
  generateCognitiveProfile('c6', 'impulsive'),
  generateCognitiveProfile('c7', 'decisive'),
  generateCognitiveProfile('c8', 'balanced'),
  generateCognitiveProfile('c9', 'analytical'),
  generateCognitiveProfile('c10', 'impulsive'),
  generateCognitiveProfile('c11', 'analytical'),
  generateCognitiveProfile('c12', 'balanced'),
  generateCognitiveProfile('c13', 'impulsive'),
  generateCognitiveProfile('c14', 'analytical'),
  generateCognitiveProfile('c15', 'balanced'),
  generateCognitiveProfile('c16', 'decisive'),
  generateCognitiveProfile('c17', 'cautious'),
  generateCognitiveProfile('c18', 'balanced'),
  generateCognitiveProfile('c19', 'cautious'),
  generateCognitiveProfile('c20', 'analytical'),
  generateCognitiveProfile('c21', 'analytical'),
  generateCognitiveProfile('c22', 'cautious'),
  generateCognitiveProfile('c23', 'balanced'),
  generateCognitiveProfile('c24', 'impulsive'),
]

// ============================================================
// ENGAGEMENT METRICS
// ============================================================

export const engagementMetrics: EngagementMetrics[] = [
  { clientId: 'c1', status: 'thriving', momentum: 'heating', currentVelocity: 8.2, baselineVelocity: 5.0, decayRate: 0, daysSinceContact: 0, expectedInterval: 3, engagementScore: 92, readinessScore: 0.89 },
  { clientId: 'c2', status: 'thriving', momentum: 'heating', currentVelocity: 6.5, baselineVelocity: 4.0, decayRate: 0, daysSinceContact: 0, expectedInterval: 4, engagementScore: 81, readinessScore: 0.76 },
  { clientId: 'c3', status: 'cooling', momentum: 'cooling', currentVelocity: 0.8, baselineVelocity: 2.2, decayRate: 64, daysSinceContact: 18, expectedInterval: 7, engagementScore: 28, readinessScore: 0.45 },
  { clientId: 'c4', status: 'thriving', momentum: 'stable', currentVelocity: 4.1, baselineVelocity: 3.8, decayRate: 0, daysSinceContact: 2, expectedInterval: 5, engagementScore: 75, readinessScore: 0.68 },
  { clientId: 'c5', status: 'thriving', momentum: 'stable', currentVelocity: 5.0, baselineVelocity: 4.5, decayRate: 0, daysSinceContact: 1, expectedInterval: 4, engagementScore: 82, readinessScore: 0.74 },
  { clientId: 'c6', status: 'thriving', momentum: 'heating', currentVelocity: 7.0, baselineVelocity: 3.5, decayRate: 0, daysSinceContact: 0, expectedInterval: 5, engagementScore: 88, readinessScore: 0.81 },
  { clientId: 'c7', status: 'thriving', momentum: 'stable', currentVelocity: 3.8, baselineVelocity: 3.5, decayRate: 0, daysSinceContact: 3, expectedInterval: 6, engagementScore: 78, readinessScore: 0.72 },
  { clientId: 'c8', status: 'active', momentum: 'stable', currentVelocity: 3.0, baselineVelocity: 2.8, decayRate: 0, daysSinceContact: 4, expectedInterval: 7, engagementScore: 65, readinessScore: 0.58 },
  { clientId: 'c9', status: 'active', momentum: 'stable', currentVelocity: 2.5, baselineVelocity: 2.5, decayRate: 0, daysSinceContact: 5, expectedInterval: 7, engagementScore: 60, readinessScore: 0.52 },
  { clientId: 'c10', status: 'active', momentum: 'heating', currentVelocity: 3.5, baselineVelocity: 2.0, decayRate: 0, daysSinceContact: 2, expectedInterval: 6, engagementScore: 68, readinessScore: 0.62 },
  { clientId: 'c11', status: 'active', momentum: 'stable', currentVelocity: 2.8, baselineVelocity: 3.0, decayRate: 5, daysSinceContact: 6, expectedInterval: 7, engagementScore: 62, readinessScore: 0.55 },
  { clientId: 'c12', status: 'active', momentum: 'stable', currentVelocity: 2.2, baselineVelocity: 2.0, decayRate: 0, daysSinceContact: 5, expectedInterval: 8, engagementScore: 58, readinessScore: 0.50 },
  { clientId: 'c13', status: 'active', momentum: 'stable', currentVelocity: 2.0, baselineVelocity: 2.0, decayRate: 0, daysSinceContact: 4, expectedInterval: 7, engagementScore: 55, readinessScore: 0.48 },
  { clientId: 'c14', status: 'active', momentum: 'stable', currentVelocity: 2.5, baselineVelocity: 2.5, decayRate: 0, daysSinceContact: 3, expectedInterval: 6, engagementScore: 63, readinessScore: 0.56 },
  { clientId: 'c15', status: 'active', momentum: 'stable', currentVelocity: 1.8, baselineVelocity: 2.0, decayRate: 8, daysSinceContact: 7, expectedInterval: 8, engagementScore: 52, readinessScore: 0.46 },
  { clientId: 'c16', status: 'active', momentum: 'stable', currentVelocity: 2.2, baselineVelocity: 2.5, decayRate: 10, daysSinceContact: 8, expectedInterval: 7, engagementScore: 56, readinessScore: 0.51 },
  { clientId: 'c17', status: 'cooling', momentum: 'cooling', currentVelocity: 1.0, baselineVelocity: 1.8, decayRate: 44, daysSinceContact: 12, expectedInterval: 8, engagementScore: 38, readinessScore: 0.35 },
  { clientId: 'c18', status: 'cooling', momentum: 'cooling', currentVelocity: 1.2, baselineVelocity: 2.5, decayRate: 52, daysSinceContact: 15, expectedInterval: 7, engagementScore: 32, readinessScore: 0.30 },
  { clientId: 'c19', status: 'cooling', momentum: 'cooling', currentVelocity: 0.5, baselineVelocity: 1.5, decayRate: 67, daysSinceContact: 20, expectedInterval: 10, engagementScore: 25, readinessScore: 0.22 },
  { clientId: 'c20', status: 'active', momentum: 'stable', currentVelocity: 2.0, baselineVelocity: 2.2, decayRate: 8, daysSinceContact: 6, expectedInterval: 7, engagementScore: 54, readinessScore: 0.47 },
  { clientId: 'c21', status: 'cold', momentum: 'cooling', currentVelocity: 0.2, baselineVelocity: 2.0, decayRate: 78, daysSinceContact: 32, expectedInterval: 5, engagementScore: 12, readinessScore: 0.15 },
  { clientId: 'c22', status: 'cold', momentum: 'cooling', currentVelocity: 0.3, baselineVelocity: 1.5, decayRate: 41, daysSinceContact: 14, expectedInterval: 10, engagementScore: 18, readinessScore: 0.20 },
  { clientId: 'c23', status: 'dormant', momentum: 'cooling', currentVelocity: 0, baselineVelocity: 1.8, decayRate: 100, daysSinceContact: 65, expectedInterval: 10, engagementScore: 5, readinessScore: 0.05 },
  { clientId: 'c24', status: 'dormant', momentum: 'cooling', currentVelocity: 0, baselineVelocity: 1.0, decayRate: 100, daysSinceContact: 45, expectedInterval: 14, engagementScore: 8, readinessScore: 0.08 },
]

// ============================================================
// PREDICTIONS — active behavioral patterns
// ============================================================

export const predictions: Prediction[] = [
  { clientId: 'c1', pattern: 'Imminent Purchase', confidence: 89, momentum: 'heating', description: '4 property views in 72 hours. Trophy buyer pattern at peak acquisition mode.', detectedAt: '2026-03-02T14:00:00Z' },
  { clientId: 'c2', pattern: 'Portfolio Expansion', confidence: 76, momentum: 'heating', description: 'Requested yield analysis on 3 properties. Investment portfolio diversification signals strong.', detectedAt: '2026-03-02T10:00:00Z' },
  { clientId: 'c3', pattern: 'Analysis Paralysis', confidence: 71, momentum: 'cooling', description: '6 months of viewings without progression. Decision velocity declining steadily.', detectedAt: '2026-03-01T09:00:00Z' },
  { clientId: 'c21', pattern: 'Flight Risk', confidence: 64, momentum: 'cooling', description: '32 days silent after strong initial engagement. Trust erosion indicators present.', detectedAt: '2026-03-02T08:00:00Z' },
  { clientId: 'c6', pattern: 'Upsell Opportunity', confidence: 72, momentum: 'heating', description: 'Budget inquiries trending 40% above original range. Ready for premium tier presentation.', detectedAt: '2026-03-01T16:00:00Z' },
  { clientId: 'c11', pattern: 'Price Negotiation', confidence: 68, momentum: 'stable', description: 'Requested 3 comparative market analyses in one week. Negotiation preparation pattern detected.', detectedAt: '2026-03-02T11:00:00Z' },
  { clientId: 'c18', pattern: 'Trust Erosion', confidence: 58, momentum: 'cooling', description: 'Response times lengthening. Engagement dropping below baseline. Re-engagement needed.', detectedAt: '2026-02-28T14:00:00Z' },
  { clientId: 'c10', pattern: 'Imminent Purchase', confidence: 74, momentum: 'heating', description: 'Emotional attachment signals to Marina penthouse. Visited twice, asked about furnishing.', detectedAt: '2026-03-02T15:00:00Z' },
  { clientId: 'c5', pattern: 'Portfolio Expansion', confidence: 65, momentum: 'stable', description: 'Discussing commercial property diversification. Shift from residential-only portfolio.', detectedAt: '2026-03-01T12:00:00Z' },
]

// ============================================================
// RELATIONSHIPS — influence network
// ============================================================

export const relationships: Relationship[] = [
  { id: 'r1', fromClientId: 'c1', toClientId: 'c8', type: 'Business Partner', influenceStrength: 0.85, cognitiveAlignment: 0.72, direction: 'bidirectional' },
  { id: 'r2', fromClientId: 'c2', toClientId: 'c11', type: 'Associate', influenceStrength: 0.60, cognitiveAlignment: 0.68, direction: 'bidirectional' },
  { id: 'r3', fromClientId: 'c3', toClientId: 'c18', type: 'Family', influenceStrength: 0.75, cognitiveAlignment: 0.55, direction: 'bidirectional' },
  { id: 'r4', fromClientId: 'c4', toClientId: 'c14', type: 'Referral', influenceStrength: 0.50, cognitiveAlignment: 0.62, direction: 'one-way' },
  { id: 'r5', fromClientId: 'c5', toClientId: 'c16', type: 'Business Partner', influenceStrength: 0.70, cognitiveAlignment: 0.78, direction: 'bidirectional' },
  { id: 'r6', fromClientId: 'c6', toClientId: 'c10', type: 'Referral', influenceStrength: 0.45, cognitiveAlignment: 0.58, direction: 'one-way' },
  { id: 'r7', fromClientId: 'c7', toClientId: 'c1', type: 'Associate', influenceStrength: 0.55, cognitiveAlignment: 0.65, direction: 'bidirectional' },
  { id: 'r8', fromClientId: 'c12', toClientId: 'c20', type: 'Business Partner', influenceStrength: 0.65, cognitiveAlignment: 0.71, direction: 'bidirectional' },
  { id: 'r9', fromClientId: 'c9', toClientId: 'c21', type: 'Referral', influenceStrength: 0.40, cognitiveAlignment: 0.50, direction: 'one-way' },
  { id: 'r10', fromClientId: 'c13', toClientId: 'c17', type: 'Spouse', influenceStrength: 0.95, cognitiveAlignment: 0.42, direction: 'bidirectional' },
]

// ============================================================
// LIFECYCLE DATA
// ============================================================

export const lifecycleData: LifecycleData[] = [
  { clientId: 'c1', lifeStage: 'Peak Acquisition', portfolioMaturity: 'Expanding', nextLikelyAction: 'Trophy purchase within 30 days', upcomingEvents: ['Ramadan entertaining season', 'Family relocation Q2'], seasonalPatterns: ['Active Nov-Mar', 'Quiet Jul-Aug'] },
  { clientId: 'c2', lifeStage: 'Active Growth', portfolioMaturity: 'Diversifying', nextLikelyAction: 'Add 2-3 investment units this quarter', upcomingEvents: ['Chinese New Year property tours', 'Business expansion Dubai'], seasonalPatterns: ['Active Jan-Apr', 'Review cycle Sep'] },
  { clientId: 'c3', lifeStage: 'Consideration', portfolioMaturity: 'First Purchase', nextLikelyAction: 'Decision needed — stalling risk', upcomingEvents: ['Summer relocation deadline'], seasonalPatterns: ['Active Mar-Jun', 'Travel Jul-Aug'] },
  { clientId: 'c4', lifeStage: 'Building Phase', portfolioMaturity: 'Growing', nextLikelyAction: 'Second property within 60 days', upcomingEvents: ['UK tax year end', 'Family visit Dubai Apr'], seasonalPatterns: ['Active Oct-Mar'] },
  { clientId: 'c21', lifeStage: 'At Risk', portfolioMaturity: 'Stalled', nextLikelyAction: 'Re-engagement or lost', upcomingEvents: ['Swiss banking review cycle'], seasonalPatterns: ['Historically active Q1'] },
]

// ============================================================
// SIGNALS — recent activity feed
// ============================================================

export const signals: Signal[] = [
  { id: 's1', clientId: 'c1', type: 'viewing', content: 'Viewed Palm Villa #8 floor plans and virtual tour', timestamp: '2026-03-03T18:12:00Z', impact: [{ dimension: 'Decision Velocity', delta: 8 }, { dimension: 'Status Orientation', delta: 5 }] },
  { id: 's2', clientId: 'c1', type: 'viewing', content: 'Viewed Palm Villa #8 neighborhood amenities', timestamp: '2026-03-03T17:45:00Z', impact: [{ dimension: 'Detail Orientation', delta: 3 }] },
  { id: 's3', clientId: 'c2', type: 'inquiry', content: 'Requested Marina Tower yield analysis and rental projections', timestamp: '2026-03-03T17:30:00Z', impact: [{ dimension: 'Detail Orientation', delta: 6 }, { dimension: 'Risk Tolerance', delta: -2 }] },
  { id: 's4', clientId: 'c4', type: 'meeting', content: 'Confirmed viewing at Emirates Hills — Tuesday 2pm', timestamp: '2026-03-03T16:20:00Z', impact: [{ dimension: 'Trust Formation', delta: 4 }] },
  { id: 's5', clientId: 'c11', type: 'offer', content: 'Submitted offer on Downtown penthouse — AED 45M', timestamp: '2026-03-03T15:10:00Z', impact: [{ dimension: 'Decision Velocity', delta: 15 }, { dimension: 'Price Sensitivity', delta: -5 }] },
  { id: 's6', clientId: 'c8', type: 'viewing', content: 'Browsing new Palm Jumeirah listings — 3rd session this week', timestamp: '2026-03-03T14:40:00Z', impact: [{ dimension: 'Decision Velocity', delta: 5 }] },
  { id: 's7', clientId: 'c10', type: 'inquiry', content: 'Asked about visa requirements for property purchase', timestamp: '2026-03-03T13:20:00Z', impact: [{ dimension: 'Trust Formation', delta: 3 }, { dimension: 'Detail Orientation', delta: 4 }] },
  { id: 's8', clientId: 'c6', type: 'financial', content: 'Discussed budget increase — now looking at premium tier', timestamp: '2026-03-03T12:00:00Z', impact: [{ dimension: 'Price Sensitivity', delta: -10 }, { dimension: 'Status Orientation', delta: 8 }] },
  { id: 's9', clientId: 'c5', type: 'inquiry', content: 'Requested commercial property portfolio options', timestamp: '2026-03-03T10:30:00Z', impact: [{ dimension: 'Risk Tolerance', delta: 5 }, { dimension: 'Innovation Appetite', delta: 6 }] },
  { id: 's10', clientId: 'c7', type: 'referral', content: 'Referred a new contact — François Leclerc, Paris-based UHNW', timestamp: '2026-03-02T16:00:00Z', impact: [{ dimension: 'Loyalty Tendency', delta: 10 }, { dimension: 'Trust Formation', delta: 5 }] },
  { id: 's11', clientId: 'c12', type: 'meeting', content: 'Completed viewing of Business Bay tower unit', timestamp: '2026-03-02T14:00:00Z', impact: [{ dimension: 'Decision Velocity', delta: 4 }] },
  { id: 's12', clientId: 'c1', type: 'viewing', content: 'Viewed Palm Villa #8 — in person showing with family', timestamp: '2026-03-02T11:00:00Z', impact: [{ dimension: 'Decision Velocity', delta: 12 }, { dimension: 'Emotional Driver', delta: 8 }] },
]

// ============================================================
// PROPERTIES
// ============================================================

export const properties: Property[] = [
  { id: 'p1', name: 'Palm Villa #8', area: 'Palm Jumeirah', bedrooms: 7, price: 185_000_000, currency: 'AED', type: 'Villa', features: ['Beachfront', 'Private Pool', 'Smart Home', 'Cinema Room'] },
  { id: 'p2', name: 'Marina Tower Penthouse', area: 'Dubai Marina', bedrooms: 4, price: 52_000_000, currency: 'AED', type: 'Penthouse', features: ['Full Floor', 'Marina View', 'Private Elevator'] },
  { id: 'p3', name: 'Emirates Hills Estate', area: 'Emirates Hills', bedrooms: 9, price: 220_000_000, currency: 'AED', type: 'Estate', features: ['Golf Course View', 'Staff Quarters', 'Tennis Court'] },
  { id: 'p4', name: 'Downtown Sky Collection', area: 'Downtown Dubai', bedrooms: 3, price: 45_000_000, currency: 'AED', type: 'Penthouse', features: ['Burj Khalifa View', 'Concierge', 'Infinity Pool'] },
  { id: 'p5', name: 'Bluewaters Residences', area: 'Bluewaters Island', bedrooms: 5, price: 78_000_000, currency: 'AED', type: 'Apartment', features: ['Sea View', 'Private Beach', 'Resort Living'] },
  { id: 'p6', name: 'Palm Royal Villa', area: 'Palm Jumeirah', bedrooms: 6, price: 135_000_000, currency: 'AED', type: 'Villa', features: ['Tip Location', 'Atlantis View', 'Infinity Pool'] },
  { id: 'p7', name: 'Creek Harbour Tower', area: 'Dubai Creek', bedrooms: 2, price: 18_000_000, currency: 'AED', type: 'Apartment', features: ['Creek View', 'New Build', 'Smart Home'] },
  { id: 'p8', name: 'Al Barari Sanctuary', area: 'Al Barari', bedrooms: 6, price: 42_000_000, currency: 'AED', type: 'Villa', features: ['Tropical Gardens', 'Heart of Nature', 'Spa Facilities'] },
  { id: 'p9', name: 'DIFC Living Tower', area: 'DIFC', bedrooms: 3, price: 28_000_000, currency: 'AED', type: 'Apartment', features: ['Walk to Work', 'Premium Finishes', 'City View'] },
  { id: 'p10', name: 'Jumeirah Bay Mansion', area: 'Jumeirah Bay', bedrooms: 8, price: 165_000_000, currency: 'AED', type: 'Villa', features: ['Island Living', 'Private Dock', 'Panoramic Sea View'] },
]

// ============================================================
// MATCHES — property-client chemistry
// ============================================================

export type MatchStage = 'Identified' | 'Presented' | 'Viewing Scheduled' | 'Viewed' | 'Offer Prep' | 'Offer Sent' | 'Negotiation' | 'Closed'

export const MATCH_STAGES: MatchStage[] = ['Identified', 'Presented', 'Viewing Scheduled', 'Viewed', 'Offer Prep', 'Offer Sent', 'Negotiation', 'Closed']

export const matchStageColors: Record<MatchStage, string> = {
  'Identified': '#6b7280',
  'Presented': '#06b6d4',
  'Viewing Scheduled': '#3b82f6',
  'Viewed': '#8b5cf6',
  'Offer Prep': '#a78bfa',
  'Offer Sent': '#f59e0b',
  'Negotiation': '#f97316',
  'Closed': '#22c55e',
}

export interface MatchWithStage extends Match {
  stage: MatchStage
  stageChangedAt: string
  presented: boolean
  presentedAt?: string
  viewingDate?: string
  offerAmount?: number
  notes?: string
}

export const matches: Match[] = [
  { id: 'm1', clientId: 'c1', propertyId: 'p1', grade: 'A+', overallScore: 0.91, pillars: { clientFit: 0.91, financial: 0.85, value: 0.94, timing: 0.89 }, aiIntelligence: 'WHY THIS MATCH: Palm Villa #8 was surfaced for Al Maktoum because it is the only property in our inventory that simultaneously satisfies his three non-negotiable criteria: waterfront positioning with private beach access, a cinema room (his wife\'s explicit requirement from the March 1 meeting), and sub-AED 200M pricing within the Palm Jumeirah trophy corridor. Of 847 active listings scanned, only 3 properties met all three filters. Palm Villa #8 scored highest by 14 points due to the cinema room -- a feature directly tied to family buy-in. || CLIENT PSYCHOLOGY: Al Maktoum is classified as a "decisive trophy buyer." His cognitive profile shows Decision Velocity at 90/100 (surged +15pts after 4 viewings in 72 hours), Status Orientation at 85/100, and critically low Price Sensitivity at 35/100. This means he buys based on prestige and emotional conviction, not price optimization. His wife showed strong emotional response to the cinema room during the family tour, which Engine 2 flags as a "spousal buy-in" signal -- present in 82% of successful UHNW family acquisitions. Readiness score: 0.89, momentum heating at 8.2 signals/week, 64% above his baseline engagement rate. || FINANCIAL CASE: AED 185M sits at 74% of his AED 250M budget ceiling, leaving AED 65M headroom. This is intentional positioning -- his archetype prefers properties priced below maximum to maintain a sense of control during negotiation. Portfolio value AED 450M+ with no financing constraints. Comparable sales analysis: Palm Jumeirah villas with private beach averaged AED 195M in Q1 2026, making this competitively priced. The 7-bedroom configuration commands a 12% premium in resale value versus 5-bedroom alternatives. || TIMING: 4 property views in 72 hours triggered the "Imminent Purchase" behavioral pattern at 89% confidence. This velocity is 3.2x his historical average and matches the pre-purchase acceleration curve seen in 78% of completed UHNW transactions. His daughter\'s school term starts April 15, creating a natural move-in deadline that compresses the decision window. || STRATEGY: Present formal offer package within 48 hours. Lead with cinema room and family lifestyle narrative, not price. Prepare AED 180M opening offer with expectation of settling at AED 183-185M. Have furnishing portfolio ready as a sweetener if counter-offer exceeds AED 185M. This is textbook trophy acquisition at peak confluence -- do not delay.', createdAt: '2026-03-02T10:00:00Z' },
  { id: 'm2', clientId: 'c1', propertyId: 'p3', grade: 'A', overallScore: 0.82, pillars: { clientFit: 0.88, financial: 0.78, value: 0.80, timing: 0.82 }, aiIntelligence: 'WHY THIS MATCH: Emirates Hills Estate was generated as Al Maktoum\'s strategic backup. If Palm Villa #8 enters a counter-offer impasse, this property provides negotiation leverage by showing the client has alternatives at a comparable tier. The golf-course frontage activates his Status Orientation dimension (85/100), and the 9-bedroom layout surpasses his space requirements for multi-generational family use. It scored 88% Client Fit due to the prestige address and estate-scale grounds. || CLIENT PSYCHOLOGY: Al Maktoum\'s "decisive" archetype has one friction point with this property: the price exceeds his psychological comfort zone. At AED 220M, it sits 12% above his budget sweet spot. Decisive buyers prefer clean, uncomplicated numbers. The cognitive model recommends reframing this as a "portfolio legacy asset" rather than a primary residence. This framing bypasses his price sensitivity by activating his Innovation Appetite dimension (65/100), which responds to novel investment positioning. He has a secondary identity as a portfolio builder -- this property can be positioned under that framework. || FINANCIAL CASE: AED 220M at 88% of budgetMax. While technically affordable, it creates tighter negotiation margins. Emirates Hills estates appreciated 18% in 2025, outperforming Palm Jumeirah by 3 percentage points. Land plot value alone represents AED 140M based on comparable transfers. The 9-bedroom configuration and 22,000 sqft built area place it in the ultra-premium segment where comparable inventory is limited to 4 active listings city-wide. || TIMING: Timing pillar strong at 82%. Al Maktoum is already in active acquisition mode. The risk is presenting this too early and creating decision paralysis between two strong options. Engine recommends holding this in reserve until the Palm Villa outcome is clear. || STRATEGY: Do NOT present alongside Palm Villa #8. Hold as a strategic fallback. If Palm negotiations stall, introduce Emirates Hills as "an opportunity that just surfaced" to maintain acquisition momentum and prevent the client from cooling off.', createdAt: '2026-03-01T14:00:00Z' },
  { id: 'm3', clientId: 'c2', propertyId: 'p2', grade: 'A', overallScore: 0.79, pillars: { clientFit: 0.72, financial: 0.88, value: 0.82, timing: 0.75 }, aiIntelligence: 'WHY THIS MATCH: Marina Penthouse 42 was matched to Chen Wei because he submitted 6 rental yield analysis requests in 14 days, all focused on waterfront high-rise inventory with gross yields above 5%. This penthouse delivers 5.8% projected gross yield -- the highest among all available Marina units -- and his analytical decision framework weights ROI above all other factors. Engine 2 scanned 312 investment-grade units across Marina, JLT, and Business Bay. This property ranked #1 on his stated yield threshold while also meeting his minimum spec of 3+ bedrooms and branded residences. || CLIENT PSYCHOLOGY: Chen Wei is a textbook "analytical" archetype. His cognitive profile reads: Detail Orientation 95/100, Risk Tolerance 45/100, Decision Velocity 35/100. He will not commit without exhaustive data. He has requested comparable rental analysis, historical yield trends, service charge breakdowns, and occupancy rate data -- all before his first viewing. His 6 yield requests confirm an ROI-first decision framework. The low Decision Velocity (35/100) means you should expect a 3-4 week evaluation cycle before any commitment signal emerges. Do not rush him -- analytical archetypes abandon advisors who apply premature pressure. || FINANCIAL CASE: AED 52M at 34.6% of his AED 150M budgetMax. This conservative allocation is characteristic of analytical investors who diversify across multiple assets rather than concentrating in a single property. Rental yield projection: 5.8% gross, 4.1% net after service charges (AED 45/sqft annual). This outperforms comparable Marina units averaging 4.8% gross. 36-month appreciation model projects +11.3% based on Marina waterfront premiums and branded residency demand. His Shanghai portfolio generates 3.2% average yield, so this represents a 180bps improvement. || TIMING: "Portfolio Expansion" behavioral pattern detected at 76% confidence. Timing suppressed at 75% because his Decision Velocity predicts 3-4 week evaluation cycles before commitment. He is currently in data-gathering mode, not decision mode. Pushing for action now would be counterproductive. || STRATEGY: Lead with data, not emotion. Send a complete ROI matrix within 24 hours: comparable rental yields, occupancy rates, service charge projections, and 3-year appreciation scenarios. Include a direct comparison against his Shanghai portfolio returns. Schedule viewing only after he has reviewed all documentation and confirmed interest. Do not present alternatives until he has fully evaluated this option.', createdAt: '2026-03-02T09:00:00Z' },
  { id: 'm4', clientId: 'c10', propertyId: 'p2', grade: 'A', overallScore: 0.78, pillars: { clientFit: 0.82, financial: 0.75, value: 0.78, timing: 0.76 }, aiIntelligence: 'WHY THIS MATCH: Marina Penthouse 42 was surfaced for Sofia Moretti because her behavioral signals indicate deep emotional attachment to this specific unit. She has visited twice in 10 days, spending 55+ minutes each time (vs. 35-minute average for lifestyle buyers). During the second visit, she asked about custom furnishing options and curtain fabrics -- Engine 2 classifies this as "emotional anchoring," a behavioral pattern that precedes purchase in 73% of lifestyle buyer transactions. No other property in her pipeline has triggered repeat-visit behavior. || CLIENT PSYCHOLOGY: Moretti is classified as an "impulsive lifestyle buyer." Emotional Driver scores 85/100, Decision Velocity 95/100 -- she makes fast, feeling-driven decisions. The critical signal: she brought a close friend to the second viewing who also expressed enthusiasm. Engine 2\'s Social Proof dimension (60/100) registers peer validation as a purchase catalyst for this archetype. Her body language analysis from viewing notes ("lingered at terrace, photographed kitchen 3x, discussed hosting dinner parties") confirms she is mentally moved in. This is not a browsing client -- this is a buyer attaching to a home. || FINANCIAL CASE: AED 52M sits at 86.6% of her stated AED 60M budget, which is at the upper end. However, two mitigating factors: her partner received a CEO promotion last month (captured via LinkedIn signal), projecting household income increase of 30-40%. Additionally, her family office in Milan has AED 180M in liquid assets. The financial pillar at 75% reflects current stated budget, but real purchasing power is substantially higher. Furnishing package (estimated AED 2-3M) could be positioned as a deal sweetener rather than additional cost. || TIMING: Timing pillar at 76% reflects active momentum -- two viewings in 10 days with escalating engagement signals. She mentioned "wanting to settle before Ramadan" in her last call, creating a natural 3-week purchase window. Her Decision Velocity (95/100) means once she decides, she moves fast. The risk is delay, not haste. || STRATEGY: Do NOT show alternatives. Emotional attachment is a closing signal that gets diluted by comparison shopping. Present a curated furnishing package with 3 interior design options to deepen her emotional investment. Frame next step as "securing your home" not "making an offer." Schedule a third visit focused on the furnishing walkthrough. If she commits, move to offer within 48 hours.', createdAt: '2026-03-01T11:00:00Z' },
  { id: 'm5', clientId: 'c4', propertyId: 'p9', grade: 'B+', overallScore: 0.68, pillars: { clientFit: 0.65, financial: 0.72, value: 0.70, timing: 0.65 }, aiIntelligence: 'WHY THIS MATCH: DIFC Living Tower was matched to James O\'Brien because his "Portfolio Builder" client category requires properties with strong rental fundamentals near commercial hubs. He works in DIFC and has explicitly stated "walk-to-work" as a top-3 criterion. Engine 2 scored this property highest in the lifestyle sub-engine for Portfolio Builders: walkability to DIFC (4 min), proximity to Gate Avenue dining and retail, and 6.2% gross rental yield. Of the 48 DIFC-adjacent properties evaluated, this scored 22% higher than the next-best on his weighted criteria. || CLIENT PSYCHOLOGY: O\'Brien has a "balanced" cognitive profile -- all dimensions score in the 55-65 range with no strong skews. This means he is methodical, not easily excited, and requires structured comparison before committing. His Detail Orientation (60/100) demands a minimum of 5 comparable viewings before he considers himself informed enough to decide -- he is currently at property #3. Pushing for commitment before he reaches his threshold will trigger resistance. He is also running a parallel evaluation of Emirates Hills properties, which extends his decision cycle by 2-3 weeks. This is normal for balanced profiles and not a disengagement signal. || FINANCIAL CASE: AED 28M at 80% of his AED 35M budgetMax. This leaves AED 7M negotiation headroom, which is important because his archetype derives satisfaction from negotiating a perceived discount. Rental yield: 6.2% gross, among the highest in DIFC corridor. Service charges AED 38/sqft (below the DIFC average of AED 42/sqft). 24-month appreciation forecast: +9.8% based on DIFC commercial expansion and ICD Brookfield development completion. His existing London portfolio averages 3.8% yield, so this represents a 240bps premium. || TIMING: Timing at 65% reflects his dual-track evaluation process. He has not yet reached his 5-property viewing threshold, which means he is still in information-gathering mode. Forcing the pace will backfire with this archetype. Expected decision timeline: 4-6 weeks from now. || STRATEGY: Schedule 2 more viewings of comparable DIFC/Business Bay properties to satisfy his comparison requirement. After the 5th viewing, present a structured comparison matrix ranking all properties on his stated criteria (walk-to-work, yield, service charges, appreciation). Position DIFC Living Tower as the data-driven winner. Do not use emotional framing -- lead with spreadsheets and numbers.', createdAt: '2026-03-01T16:00:00Z' },
  { id: 'm6', clientId: 'c6', propertyId: 'p5', grade: 'A', overallScore: 0.80, pillars: { clientFit: 0.85, financial: 0.78, value: 0.80, timing: 0.77 }, aiIntelligence: 'WHY THIS MATCH: Bluewaters Penthouse was matched to Pieter Van der Berg because his engagement signals show a fundamental shift in buying intent. Originally searching in the AED 40-60M range for investment properties, he has pivoted toward lifestyle-first acquisitions after attending a Bluewaters developer event. Engine 2 detected a "budget expansion event" -- his stated range increased 40% to AED 60-80M within one week. This property\'s resort-living concept (private beach club, celebrity-chef restaurants, Ain Dubai views) directly activates his Emotional Driver (85/100) and Status Orientation (90/100) dimensions. No other property in the pipeline triggered a budget expansion. || CLIENT PSYCHOLOGY: Van der Berg is an "impulsive" archetype dominated by emotion and status. Emotional Driver 85/100 and Status Orientation 90/100 mean he responds to aspirational lifestyle narratives, not ROI calculations. His budget expansion is not reckless -- it reflects a psychological shift from investor to lifestyle buyer. Key insight: he mentioned "wanting a place that impresses my clients" during his last call. This reveals a secondary motivation: the property is also a business hospitality tool. Bluewaters\' celebrity dining and beach club directly serve this use case. Readiness 0.81, accelerating at 7.0 signals/week (up from 4.2 baseline). || FINANCIAL CASE: AED 75M at the midpoint of his expanded AED 60-80M range. Portfolio value AED 320M with Johannesburg real estate comprising 60%. Financial alignment recalculated from 58% to 78% after the budget expansion event. Cape Town penthouse sold for AED 45M last quarter, freeing liquidity. Bluewaters premiums have appreciated 22% since Ain Dubai opening, with limited new inventory entering the market. Rental potential during absence: AED 800K/year short-term luxury rental through hotel operator program. || TIMING: "Upsell Opportunity" pattern detected at 72% confidence with heating momentum. His engagement has accelerated post-event. The risk is that his emotional enthusiasm fades if not channeled into action within 2 weeks. Impulsive archetypes have shorter commitment windows than analytical ones. || STRATEGY: Frame this as the definitive lifestyle upgrade -- "the address that redefines your Dubai presence." Lead with experience, not numbers: arrange a sunset viewing with dinner at the Bluewaters beach club. Mention the client-entertainment angle he raised. Do NOT present ROI data unless he asks -- for this archetype, data creates doubt rather than confidence. Move toward offer within 10 days while enthusiasm is at peak.', createdAt: '2026-03-02T12:00:00Z' },
  { id: 'm7', clientId: 'c11', propertyId: 'p4', grade: 'A+', overallScore: 0.86, pillars: { clientFit: 0.80, financial: 0.92, value: 0.88, timing: 0.85 }, aiIntelligence: 'WHY THIS MATCH: Downtown Residences #4 was matched to Dr. Sarah Kim because her search pattern converges on a specific profile: Burj Khalifa-view units with premium finishes in the AED 40-50M range. She requested 3 comparative market analyses in 7 days, all focused on Downtown high-rises. This property delivers the best view angle (direct Burj Khalifa frontage from floors 45-52), highest finish specification (Italian marble, Gaggenau appliances), and competitive pricing at AED 45M. Engine 2 ranked it #1 out of 28 Downtown units evaluated against her weighted criteria. || CLIENT PSYCHOLOGY: Dr. Kim is an "analytical" archetype (Detail Orientation 95/100, Risk Tolerance 45/100) who approaches property purchase with the rigor of a medical research protocol. She has completed 3 comparative analyses, requested neighborhood noise data, and asked for the building\'s structural engineering certificates. This thoroughness is not hesitation -- it is her decision-making process. Her offer preparation signals are strong: call duration increased 40% in the last week, she submitted pre-qualification documents unprompted, and her inquiry specificity has escalated from general questions to unit-specific details (floor plan dimensions, ceiling heights, HVAC specifications). These are textbook pre-commitment signals for analytical archetypes. || FINANCIAL CASE: AED 45M offer at 45% of her AED 100M budgetMax -- a conservative allocation indicating she views this as one component of a diversified portfolio, not her primary investment. Financial alignment exceptional at 92%. Her Korean tech portfolio generates 4.5% annual returns; Downtown Dubai appreciation of 14.2% over 36 months (projected) offers significant alpha. Comparable units in the same building traded at AED 42-48M in the last 6 months. Negotiation model predicts counter-offer tolerance up to AED 46.5M based on her negotiation style score (60/100) -- she will negotiate but not aggressively. || TIMING: Offer preparation signals detected across 3 data streams: call duration increase, document submission, and escalating inquiry specificity. "Price Negotiation" pattern triggered at 68% confidence. Close probability: 78% within 10 days. She has a Seoul business trip scheduled for March 18, creating a natural decision deadline. || STRATEGY: Respond to her offer with a structured counter at AED 46M with a justification package (3 comparable transactions, view premium analysis, appreciation forecast). Include building specification documents she has not yet requested to demonstrate thoroughness matching her own. She will respect an advisor who anticipates her data needs. Do not negotiate emotionally -- present numbers and let her analytical framework reach the conclusion.', createdAt: '2026-03-03T15:00:00Z' },
  { id: 'm8', clientId: 'c7', propertyId: 'p10', grade: 'A+', overallScore: 0.88, pillars: { clientFit: 0.92, financial: 0.82, value: 0.90, timing: 0.88 }, aiIntelligence: 'WHY THIS MATCH: Jumeirah Bay Mansion was matched to Marc Dubois because it is the only property in our portfolio that satisfies his three stated requirements: island exclusivity, private marine dock, and sub-AED 175M pricing. His "trophy buyer" profile demands properties that signal ultra-elite status. Jumeirah Bay Island has only 12 waterfront mansions, and this is one of 2 currently available -- scarcity that directly activates his Status Orientation (85/100). The private dock accommodates his 65-foot yacht (confirmed via marina records). Client Fit at 92% is the second-highest in the active portfolio, behind only the closed Nakamura deal. || CLIENT PSYCHOLOGY: Dubois is a "decisive" archetype (Decision Velocity 90/100) who moves fast once conviction forms. His Loyalty Tendency (70/100) is reinforced by two key signals: he referred Francois Leclerc to our advisory (unprompted referrals indicate deep trust), and he has not engaged any competing brokerages during this search (single-source loyalty confirmed via market intelligence). He negotiates firmly but fairly -- his Negotiation Style score (65/100) suggests he seeks win-win outcomes rather than aggressive discounting. Key personal context: his daughter is enrolling at a Dubai international school in September 2026, creating a family relocation timeline that strengthens purchase urgency. || FINANCIAL CASE: Current impasse at AED 160M (client offer) vs. AED 170M (seller counter). His maximum stated budget is AED 160M, but Engine 2\'s financial modeling identifies a path: furniture and art package valued at AED 8-10M included in the deal bridges the gap without raising the headline number. His portfolio (AED 380M including Paris properties) supports this easily. Critical network insight: Dubois is connected to Al Maktoum through the Monaco Yacht Club (influence score 0.55). A successful close for Dubois could trigger social proof signaling that catalyzes the Al Maktoum Palm Villa deal -- making this a potential 2-for-1 close event worth AED 345M combined. || TIMING: Active negotiation with 88% timing score. Seller has indicated flexibility on package inclusions. Dubois\'s daughter\'s school enrollment creates a September deadline, but his Decision Velocity suggests he prefers to act sooner. The negotiation has been active for 6 days -- his archetype typically resolves within 10 days. || STRATEGY: Present AED 165M with furniture and art package as "final best offer" this week. Frame it as: "We secured AED 5M in premium furnishings at no additional cost." This gives Dubois a win narrative (he got more for less) while reaching the seller\'s acceptable range. Emphasize the school enrollment timeline to create constructive urgency. If this closes, immediately prepare an Al Maktoum presentation referencing the Dubois acquisition as social proof.', createdAt: '2026-02-20T10:00:00Z' },
  { id: 'm9', clientId: 'c5', propertyId: 'p4', grade: 'B+', overallScore: 0.71, pillars: { clientFit: 0.68, financial: 0.80, value: 0.72, timing: 0.64 }, aiIntelligence: 'WHY THIS MATCH: Downtown Residences #4 was identified for Takashi Yamamoto as a residential anchor within his evolving Dubai portfolio strategy. He recently requested commercial property information, triggering a "Portfolio Expansion" pattern at 65% confidence. Engine 2 recognizes that sophisticated Japanese investors typically build diversified portfolios with one premium residential asset as the anchor. This property\'s Burj Khalifa views, premium finishes, and strong appreciation trajectory (14.2% projected over 36 months) align with the "anchor asset" profile. It was surfaced proactively before he reaches the residential decision point. || CLIENT PSYCHOLOGY: Yamamoto is an "analytical" archetype whose current focus is commercial real estate. His cognitive profile (Detail Orientation 90/100, Risk Tolerance 40/100) means he approaches every asset class with the same systematic rigor. His Tokyo financial advisor has recommended a dual-track approach (commercial + residential), which extends his residential timeline by 4-6 weeks. Client Fit is suppressed at 68% because the engine correctly weights his current commercial pivot as the primary interest. However, historical behavioral models for Japanese UHNW investors show 85% eventually add a premium residential component within 3 months of commercial acquisition. He is not ready for this property today, but he will be. || FINANCIAL CASE: AED 45M at 37.5% of his AED 120M budgetMax -- a conservative allocation consistent with his risk profile and typical of first-position Dubai residential investments from Japanese buyers. His Tokyo portfolio generates 2.8% average yield; Dubai residential offers 4-5% with significantly higher appreciation, providing a clear diversification argument. Financial alignment at 80% reflects comfortable positioning with substantial headroom. No financing concerns -- full cash buyer with AED 120M+ liquid assets. || TIMING: Timing at 64% reflects the 4-6 week delay caused by his commercial property exploration. This is not a disengagement signal -- it is sequencing. His Tokyo advisor wants commercial first, residential second. Attempting to override this sequence would damage the advisory relationship. || STRATEGY: Hold presentation. Do not present this property until his commercial exploration reaches a natural conclusion (estimated 4-6 weeks). During this period, maintain light-touch engagement: share market reports, invite to PCIS events, keep the relationship warm. When the commercial deal progresses, position Downtown Residences #4 as "the residential anchor that completes your Dubai portfolio." Lead with appreciation data and portfolio diversification thesis.', createdAt: '2026-02-28T14:00:00Z' },
  { id: 'm10', clientId: 'c8', propertyId: 'p6', grade: 'B+', overallScore: 0.72, pillars: { clientFit: 0.70, financial: 0.75, value: 0.74, timing: 0.68 }, aiIntelligence: 'WHY THIS MATCH: Palm Jumeirah Signature Villa was identified for Omar Al Rashid because his browsing telemetry reveals growing conviction toward Palm Jumeirah despite his stated focus on investment-grade properties. Engine 2 detected 3 Palm-specific browsing sessions this week on our platform (view durations 8-12 minutes, significantly above the 3-minute average for casual browsing). His investment framing may be masking an emerging lifestyle interest. This villa\'s tip-location premium and AED 135M valuation place it at the intersection of investment quality and lifestyle aspiration. || CLIENT PSYCHOLOGY: Al Rashid presents as a "balanced" profile (Risk Tolerance 55/100, Innovation Appetite 55/100), but his behavior diverges from his stated preferences. He describes himself as a pure investor, yet his browsing patterns cluster on lifestyle properties with pools, beaches, and entertainment spaces. Engine 2 identifies this as "aspirational concealment" -- a common pattern among Saudi investors who prefer to justify lifestyle purchases through investment language. Communication analysis: highest response rates on WhatsApp during evening UAE hours (8-10pm). He responds to visual content (photos, videos) 3x faster than text-based dossiers. His family context: 4 children aged 6-14 suggest family lifestyle is a latent priority. || FINANCIAL CASE: AED 135M at the very top of his stated AED 30-70M range -- flagged as a stretch acquisition at 75% financial alignment. However, this assessment uses his stated budget, not his actual capacity. Portfolio cross-reference reveals AED 280M in assets, making AED 135M a 48% allocation that is within typical UHNW concentration ratios. A Riyadh property listed for AED 95M (captured via market intelligence) could fund this acquisition if sold. Palm Jumeirah tip villas appreciated 28% in 2025, the highest of any Dubai micro-market. Rental yield during off-periods: AED 1.2M/year through premium short-term rental operators. || TIMING: Timing at 68% -- conviction is building but not yet at decision threshold. His 3 browsing sessions this week represent an acceleration from 1/week in February. Engine projects he will reach viewing-ready status within 2 weeks if engagement continues at this trajectory. || STRATEGY: Present via WhatsApp with a cinematic video walkthrough (his preferred content format) during evening hours. Frame it as an investment thesis: lead with appreciation data, rental yield, and market scarcity (only 5 tip-location villas on the market). Then let the lifestyle elements sell themselves through the visuals. Do not pressure for an immediate viewing -- suggest a "no-commitment private tour at his convenience." This respects his balanced archetype\'s need for control over pacing.', createdAt: '2026-02-25T09:00:00Z' },
  { id: 'm11', clientId: 'c12', propertyId: 'p7', grade: 'B', overallScore: 0.62, pillars: { clientFit: 0.60, financial: 0.68, value: 0.64, timing: 0.56 }, aiIntelligence: 'WHY THIS MATCH: Creek Harbour Residence was initially matched to Priya Patel because her wellness-oriented lifestyle profile aligned with the waterfront walkability and green-space access. However, Engine 2 is now flagging this match for re-evaluation. During the property viewing on Feb 22, sentiment analysis detected a negative signal: she raised noise concerns that produced a "neutral" outcome instead of the expected "positive." Environmental risk modeling confirms active construction within 500m (Emaar Creek Harbour Phase 3) continuing through 2027. This mismatch between her wellness priorities and the noise environment has suppressed Client Fit to 60%. || CLIENT PSYCHOLOGY: Patel is a "balanced" archetype with strong wellness orientation (inferred from her stated preferences: yoga studio access, green spaces, quiet environment, organic dining). Her noise sensitivity is a genuine priority, not a negotiation tactic. Her reaction during the viewing was measured but clearly concerned -- she asked 3 follow-up questions about construction timelines. Engine 2\'s alternative matching algorithm has identified Al Barari Sanctuary as a 22% stronger fit on wellness-orientation dimensions: tropical gardens, zero active construction within 1km, dedicated wellness center, and ambient noise levels 40% lower than Creek Harbour current readings. || FINANCIAL CASE: AED 18M at 60% of her AED 30M budget -- well within range. But the value proposition is weakened by the construction disruption. Creek Harbour units within 500m of active construction traded at a 6-8% discount to quiet-zone comparables in Q4 2025. Financial alignment at 68% reflects this environmental discount not being priced into the current listing. Al Barari alternatives in her budget range (AED 22-28M) offer stronger value-per-sqft with no construction risk. || TIMING: Timing at 56% -- momentum has stalled since the viewing. She has not initiated contact in 14 days, and her engagement velocity dropped from 3.2 to 1.1 signals/week. This is not full disengagement, but the noise concern has created hesitation that will worsen without intervention. || STRATEGY: Do NOT push this property further. Pivot to Al Barari with a comparative analysis: side-by-side noise profiles, wellness amenity comparison, and 3-year construction timeline overlay. Position the pivot as proactive advisory ("After your feedback, we identified a property that better matches your wellness priorities"). This demonstrates responsiveness and rebuilds momentum. Schedule Al Barari viewing within 7 days.', createdAt: '2026-02-22T11:00:00Z' },
  { id: 'm12', clientId: 'c3', propertyId: 'p8', grade: 'B', overallScore: 0.58, pillars: { clientFit: 0.72, financial: 0.55, value: 0.52, timing: 0.48 }, aiIntelligence: 'CRITICAL: Al Barari Sanctuary match for Elena Petrova is flagged for caution. This is a high-risk engagement requiring careful re-approach before any property presentation. The client has been silent for 18 days, and Engine 2 projects her engagement will drop below the recovery threshold within 2 weeks if no intervention occurs. || WHY THIS MATCH: Al Barari Sanctuary was identified because Petrova\'s lifestyle profile (wellness-focused, nature-seeking, privacy-oriented) aligns strongly with Al Barari\'s tropical gardens, spa facilities, and secluded positioning. Client Fit at 72% is the highest score we can achieve for her stated preferences in current inventory. However, this match cannot be presented in the current engagement state -- doing so risks being perceived as tone-deaf to her silence and could permanently damage the advisory relationship. || CLIENT PSYCHOLOGY: Petrova is a "cautious" archetype -- the most challenging profile in our taxonomy. Trust Formation 40/100 means she takes significantly longer to build confidence in an advisor. Risk Tolerance 25/100 means any perceived pressure triggers withdrawal. Decision Velocity 25/100 means she processes decisions slowly and needs extended reflection periods. Her 18-day silence matches the "Analysis Paralysis" pattern (71% confidence): she is overwhelmed by the decision magnitude, not disinterested. Key context: her family connection to Ivanov (influence score 0.75) represents the strongest re-engagement channel. A casual social touchpoint through this connection could restart dialogue without the pressure of a direct sales approach. || FINANCIAL CASE: AED 42M exceeds her comfortable range -- Financial pillar at 55%. Her stated budget is AED 25-45M, but her behavioral signals suggest the true comfort zone is AED 25-35M. The AED 42M price point creates financial anxiety that compounds her existing decision paralysis. If she re-engages, consider whether a lower-priced Al Barari unit (AED 28-32M) might better serve both her lifestyle needs and psychological comfort. || TIMING: Timing at 48% is the lowest in the active portfolio. Engagement has decayed 64% from peak, velocity is 0.8 signals/week (63% below baseline). Decay projection: below recovery threshold by March 22 if no contact occurs. This is the most time-sensitive re-engagement in the portfolio, but the approach must be gentle, not urgent. || STRATEGY: Do NOT present this property yet. Step 1: Re-establish personal contact within 5 days. Call personally, acknowledge the gap without referencing any property. Ask about her wellness retreat plans (noted in previous conversation). Step 2: If she responds positively, offer a low-commitment virtual tour of Al Barari as "something that reminded me of what you described." Step 3: Only after positive engagement signals resume should you present the formal match. If the Ivanov connection is accessible, arrange a casual social setting where the property can come up organically.', createdAt: '2026-02-18T10:00:00Z' },
  { id: 'm13', clientId: 'c16', propertyId: 'p6', grade: 'A+', overallScore: 0.94, pillars: { clientFit: 0.95, financial: 0.90, value: 0.96, timing: 0.95 }, aiIntelligence: 'WHY THIS MATCH: CLOSED DEAL -- Post-mortem analysis. Palm Jumeirah Signature Villa was matched to Kenji Nakamura at 94% composite score, the highest in the portfolio. Engine 2 identified this as the ideal match because Nakamura\'s "decisive trophy buyer" profile (Decision Velocity 92/100, Status Orientation 88/100) aligned precisely with the property\'s scarcity positioning: tip-location, private beach, only 3 comparable villas on the market. The match was generated 12 days before the offer was submitted. || CLIENT PSYCHOLOGY: Engine 2 correctly predicted Nakamura\'s behavior at every stage. His "decisive" archetype responded to exclusivity framing exactly as modeled: when told "two other parties have expressed interest," his engagement accelerated rather than retreated (a response predicted at 87% probability for decisive archetypes). His family context -- wife and 2 children with UAE residency ambitions -- confirmed the purchase was both a trophy acquisition and a family relocation asset. Post-close behavioral analysis: Nakamura has already initiated inquiries about a second property for his daughter, confirming the "Portfolio Expansion" pattern Engine 2 detected pre-close. || FINANCIAL CASE: Closed at AED 135M vs. Engine 2\'s projection of AED 132-138M -- financial modeling accurate within 2%. His AED 200M budget allowed comfortable acquisition at 67.5% allocation. The tip-location premium was justified: comparable non-tip Palm villas traded at AED 108-115M, making the AED 20-27M premium attributable to location scarcity. Post-acquisition valuation already shows 3.2% appreciation based on a comparable February 2026 transaction at AED 139M. || TIMING: Engine 2 predicted the purchase window 12 days pre-offer with "Imminent Purchase" pattern at 91% confidence. Actual timeline from match identification to close: 13 days. The prediction accuracy validates the behavioral modeling for decisive archetypes. || STRATEGY: This deal is the portfolio\'s proof-of-concept for the 4-pillar methodology. Key validated learnings: (1) decisive archetypes respond to exclusivity framing -- confirmed, (2) tip-location premium is justified and accepted by trophy buyers -- confirmed, (3) family context accelerates UHNW purchase timelines -- confirmed, (4) Engine 2 accuracy on this transaction: 96.2%. Action item: leverage this success in two ways. First, use the Nakamura close as social proof with Dubois (connected via Monaco network). Second, begin qualification of Nakamura\'s daughter for a separate match pipeline.', createdAt: '2026-02-15T10:00:00Z' },
  { id: 'm14', clientId: 'c14', propertyId: 'p9', grade: 'B+', overallScore: 0.67, pillars: { clientFit: 0.65, financial: 0.72, value: 0.68, timing: 0.62 }, aiIntelligence: 'WHY THIS MATCH: DIFC Living Tower was matched to Marcus Williams because his professional profile as a NYC-based institutional trader creates a specific and unusual requirement set: Bloomberg-terminal-grade property documentation, DIFC proximity for business travel efficiency, and an investment that can be justified to his firm\'s compliance team as a legitimate business asset. This property is the only DIFC-adjacent unit under AED 30M that combines walk-to-work convenience with institutional-grade rental fundamentals. Engine 2 specifically flagged his request for "the same level of data I get on Bloomberg" as a documentation trigger that elevated this match above alternatives. || CLIENT PSYCHOLOGY: Williams is an "analytical" archetype shaped by institutional trading culture. His Detail Orientation is exceptionally high (estimated 92/100 based on his documentation requests). He evaluates property the way he evaluates trades: with comprehensive data, risk metrics, and peer comparisons. He will not proceed without a complete dossier that includes: comparable transaction data, rental yield curves, tenant demand metrics, service charge trend analysis, and macroeconomic overlay (AED/USD correlation, Dubai GDP growth, DIFC office demand forecasts). His NYC time zone creates viewing constraints -- he is available for calls between 4-7pm Dubai time only. One introductory call completed; he was professional, direct, and spent 80% of the call asking questions rather than listening to our presentation. Adjust approach: he wants to drive the conversation, not be sold to. || FINANCIAL CASE: AED 28M at 46.6% of his AED 60M budgetMax -- comfortable mid-range positioning. His Wall Street compensation structure includes significant annual bonuses (typically Q1), which may accelerate purchasing power. DIFC rental yields at 6.2% gross significantly outperform Manhattan residential yields (2.8-3.5%). This comparison will resonate with his financial framework. Service charges at AED 38/sqft are 9.5% below the DIFC average, strengthening the net yield argument. 24-month appreciation model: +9.8% based on DIFC commercial expansion corridor. || TIMING: Timing at 62% reflects very early Discovery stage -- only 1 call completed. His NYC-based schedule means viewings require international travel coordination. He mentioned a planned Dubai trip in late March, creating a natural first-viewing window. Do not attempt to force an earlier timeline. || STRATEGY: Prepare an institutional-grade dossier before the March viewing trip. This must include: 5-year transaction heat map for DIFC corridor, rental yield curve analysis (monthly data), service charge benchmarking across DIFC, JLT, and Business Bay, macro overlay (USD/AED, Dubai GDP, DIFC occupancy trends), and a direct comparison to Manhattan investment returns. Format it as a PDF that looks like a Bloomberg research report, not a real estate brochure. Send 10 days before his arrival so he has time to review. During the viewing, let him lead -- answer questions, do not pitch.', createdAt: '2026-03-01T10:00:00Z' },
  { id: 'm15', clientId: 'c20', propertyId: 'p7', grade: 'B+', overallScore: 0.69, pillars: { clientFit: 0.70, financial: 0.72, value: 0.68, timing: 0.66 }, aiIntelligence: 'WHY THIS MATCH: Creek Harbour Residence was matched to Jiwon Lee because her viewing behavior signals genuine interest that her verbal communication understates. She completed a 60-minute tour (33% above the 45-minute average for analytical buyers), showed specific positive reactions to the creek waterfront views and new-build finishes, and asked detailed questions about unit orientation and natural light -- all indicators that Engine 2 classifies as "strong interest with deliberation." Her Seoul-based investment approach requires 3-4 option comparisons before commitment, meaning this is a qualified lead that needs nurturing, not an indecisive browser. || CLIENT PSYCHOLOGY: Lee is an "analytical" archetype with quality orientation. Her Korean investment culture prioritizes new-build construction (perceived lower maintenance risk), branded developers (Emaar scores highest in Korean buyer trust indices), and waterfront positioning (cultural premium on water-adjacent living). All three criteria are met by Creek Harbour. Her viewing pattern analysis: she photographed specific details (floor materials, bathroom fixtures, kitchen appliances) rather than sweeping views -- this indicates she is evaluating build quality, not just aesthetics. Her questions about building management and homeowner association structure suggest she is assessing long-term ownership viability, not short-term speculation. She communicates more in writing (email) than verbally and prefers Korean-language documentation when available. || FINANCIAL CASE: AED 18M at 51.4% of her AED 35M budgetMax -- strong headroom with no financial friction. Her Seoul apartment portfolio (estimated AED 25M based on district-level market data) generates 2.1% average yield; Creek Harbour projects 4.8% gross, offering a 270bps premium that strengthens the diversification argument. New-build premium of 8-12% over resale units is justified by lower maintenance costs over the first 5 years -- a calculation that will resonate with her analytical framework. Creek Harbour appreciation: +12.4% projected over 24 months as the district matures and commercial amenities complete. || TIMING: Timing at 66% reflects the deliberation phase typical of Seoul-based analytical buyers. She has viewed 1 of the 3-4 properties her cognitive model requires before commitment. She has not shown urgency signals, but her positive viewing behavior places her ahead of schedule for her archetype. Expected decision timeline: 3-5 weeks. || STRATEGY: Prepare an alternative viewing at Al Barari or Dubai Hills to provide the comparison data her cognitive profile requires. After 2-3 viewings, present Creek Harbour as the value-optimized choice using a structured comparison matrix (yield, appreciation, build quality, developer track record, waterfront access). Provide Korean-language property summaries if available. Communication preference: send detailed email briefings 48 hours before any meeting. Do not call without scheduling via email first -- her communication pattern shows 85% response rate to emails vs. 40% to unscheduled calls.', createdAt: '2026-02-22T14:00:00Z' },
]

export const matchStages: MatchWithStage[] = [
  { ...matches[0], stage: 'Offer Prep', stageChangedAt: '2026-03-03T10:00:00Z', presented: true, presentedAt: '2026-03-02T14:00:00Z', viewingDate: '2026-03-02T11:00:00Z', notes: 'Family loved the showing. Wife favoured cinema room. Preparing formal offer package.' },
  { ...matches[1], stage: 'Presented', stageChangedAt: '2026-03-01T16:00:00Z', presented: true, presentedAt: '2026-03-01T16:00:00Z', notes: 'Presented as secondary option alongside Palm Villa #8.' },
  { ...matches[2], stage: 'Viewed', stageChangedAt: '2026-03-02T15:00:00Z', presented: true, presentedAt: '2026-03-02T10:00:00Z', viewingDate: '2026-03-02T15:00:00Z', notes: 'Yield analysis sent. Client reviewing ROI documentation.' },
  { ...matches[3], stage: 'Offer Prep', stageChangedAt: '2026-03-02T10:00:00Z', presented: true, presentedAt: '2026-02-28T09:00:00Z', viewingDate: '2026-03-01T16:00:00Z', notes: 'Second viewing completed. Emotional attachment strong. Discussing furnishing options.' },
  { ...matches[4], stage: 'Viewing Scheduled', stageChangedAt: '2026-03-04T08:00:00Z', presented: true, presentedAt: '2026-03-01T18:00:00Z', viewingDate: '2026-03-05T14:00:00Z', notes: 'Viewing scheduled for Tuesday alongside Emirates Hills.' },
  { ...matches[5], stage: 'Viewed', stageChangedAt: '2026-03-02T16:00:00Z', presented: true, presentedAt: '2026-03-01T10:00:00Z', viewingDate: '2026-03-02T16:00:00Z', notes: 'Positive viewing. Budget expansion now covers premium tier.' },
  { ...matches[6], stage: 'Offer Sent', stageChangedAt: '2026-03-03T15:00:00Z', presented: true, presentedAt: '2026-03-02T09:00:00Z', viewingDate: '2026-03-03T10:00:00Z', offerAmount: 45_000_000, notes: 'Formal offer at AED 45M. Awaiting seller response. Client max is AED 46.5M.' },
  { ...matches[7], stage: 'Negotiation', stageChangedAt: '2026-02-28T15:00:00Z', presented: true, presentedAt: '2026-02-22T10:00:00Z', viewingDate: '2026-02-24T14:00:00Z', offerAmount: 160_000_000, notes: 'Counter-offer at AED 170M from seller. Client max AED 160M. Exploring AED 165M with furniture.' },
  { ...matches[8], stage: 'Identified', stageChangedAt: '2026-02-28T14:00:00Z', presented: false, notes: 'Match identified but client exploring commercial pivot. Hold for presentation timing.' },
  { ...matches[9], stage: 'Presented', stageChangedAt: '2026-02-26T11:00:00Z', presented: true, presentedAt: '2026-02-26T11:00:00Z', notes: 'Presented via WhatsApp with property dossier. Client interested but evaluating budget.' },
  { ...matches[10], stage: 'Viewed', stageChangedAt: '2026-02-22T14:00:00Z', presented: true, presentedAt: '2026-02-20T09:00:00Z', viewingDate: '2026-02-22T14:00:00Z', notes: 'Viewed but raised noise concerns. Preparing Al Barari alternative.' },
  { ...matches[11], stage: 'Identified', stageChangedAt: '2026-02-18T10:00:00Z', presented: false, notes: 'Client cooling — 18 days silent. Hold presentation until re-engagement.' },
  { ...matches[12], stage: 'Closed', stageChangedAt: '2026-02-28T16:00:00Z', presented: true, presentedAt: '2026-02-16T10:00:00Z', viewingDate: '2026-02-18T14:00:00Z', offerAmount: 135_000_000, notes: 'CLOSED. Purchase agreement signed. Champagne celebration at property.' },
  { ...matches[13], stage: 'Identified', stageChangedAt: '2026-03-01T10:00:00Z', presented: false, notes: 'New match — preparing data package. Client needs Bloomberg-grade documentation.' },
  { ...matches[14], stage: 'Viewed', stageChangedAt: '2026-02-22T14:00:00Z', presented: true, presentedAt: '2026-02-20T10:00:00Z', viewingDate: '2026-02-22T11:00:00Z', notes: 'Positive second viewing. Creek views resonated. Preparing offer discussion.' },
]

export function getMatchStage(matchId: string) { return matchStages.find(m => m.id === matchId) }
export function getMatchesForClient(clientId: string) { return matchStages.filter(m => m.clientId === clientId) }
export function getMatchesForProperty(propertyId: string) { return matchStages.filter(m => m.propertyId === propertyId) }
export function getMatchesByStage(stage: MatchStage) { return matchStages.filter(m => m.stage === stage) }

// ============================================================
// RECOMMENDATIONS — Act / Monitor / Prepare
// ============================================================

export const recommendations: Recommendation[] = [
  // ── ACT NOW ──────────────────────────────────────────────
  { id: 'rec1', clientId: 'c1', urgency: 'Act', category: 'Property', title: 'Present Palm Villa #8 to Al Maktoum', description: 'Client at 89% purchase readiness with 4 property views in 72 hours. This velocity is 3.2x his historical average and matches the pre-purchase acceleration curve seen in 78% of completed UHNW transactions. His daughter\'s school term starts April 15, creating a natural deadline.', createdAt: '2026-03-07T08:00:00Z', matchId: 'm1', propertyId: 'p1', timeframe: 'Within 48 hours', expectedOutcome: 'Formal offer at AED 180-185M. Close probability 85% within 12 days if presented this week. Delay risks cooling from peak acquisition momentum.', confidence: 0.91, impact: 'High', relatedReportId: 'rpt1', whyNow: '4 viewings in 72 hours triggered "Imminent Purchase" pattern at 89% confidence. Wife showed strong emotional response to cinema room. Daughter\'s school enrollment April 15 compresses the decision window. This is textbook trophy acquisition at peak confluence.', clientContext: 'Decisive trophy buyer. Decision Velocity 90/100, Status Orientation 85/100, Price Sensitivity 35/100. He buys on prestige and emotional conviction. Wife\'s cinema room reaction is the "spousal buy-in" signal present in 82% of successful UHNW family acquisitions.', nextSteps: '1. Prepare formal offer package with lifestyle narrative (lead with cinema room, not price). 2. Set AED 180M opening offer, settling expectation AED 183-185M. 3. Have furnishing portfolio ready as sweetener if counter exceeds AED 185M. 4. Schedule exclusive presentation within 48 hours.' },
  { id: 'rec2', clientId: 'c3', urgency: 'Act', category: 'Relationship', title: 'Re-engage Elena Petrova before recovery deadline', description: 'Client has been silent 18 days with 64% engagement decay. Engine projects she will drop below the recovery threshold by March 22 if no intervention. The Ivanov connection (influence score 0.75) represents the strongest re-engagement channel.', createdAt: '2026-03-07T08:00:00Z', matchId: 'm12', propertyId: 'p8', timeframe: 'Within 5 days', expectedOutcome: 'Re-establish dialogue and prevent permanent disengagement. If successful, transition to Al Barari virtual tour within 2 weeks. Loss of this client would remove AED 25-45M from the pipeline.', confidence: 0.71, impact: 'High', relatedReportId: 'rpt9', whyNow: 'Engagement decay rate accelerating: from 3.2 to 0.8 signals/week. March 22 is the projected point of no return based on historical patterns for cautious archetypes. Every day of delay reduces recovery probability by approximately 4%.', clientContext: 'Cautious archetype with Trust Formation 40/100 and Risk Tolerance 25/100. Her silence is "Analysis Paralysis" (71% confidence), not disinterest. AED 42M price may exceed her true comfort zone (AED 25-35M). Direct property pitches will feel tone-deaf.', nextSteps: '1. Call personally within 48 hours. Do NOT mention any property. 2. Ask about her wellness retreat plans (noted in previous conversation). 3. If positive response, offer low-commitment virtual Al Barari tour. 4. If Ivanov connection accessible, arrange casual social setting.' },
  { id: 'rec3', clientId: 'c21', urgency: 'Act', category: 'Relationship', title: 'Critical: Hans Muller flight risk', description: '32 days silent with 78% engagement decay. This is the most severe disengagement in the portfolio. Personal outreach required immediately with an exclusive off-market offering as re-engagement hook. Client was previously interested in Downtown and DIFC properties.', createdAt: '2026-03-07T08:00:00Z', timeframe: 'Immediate', expectedOutcome: 'Prevent permanent client loss. Re-engagement success rate drops below 20% after 40 days of silence. Pipeline impact: AED 35-50M at risk.', confidence: 0.65, impact: 'High', whyNow: '78% decay is approaching the point of no return. Historical data shows clients who go 40+ days silent have only 18% re-engagement success. He is 8 days from that threshold. Competitor intelligence suggests he may have started working with a rival brokerage.', clientContext: 'Originally a balanced profile with moderate engagement. His silence began after a viewing that did not meet expectations. He requires a fresh approach with a genuinely compelling, previously unseen opportunity to justify re-engagement.', nextSteps: '1. Personal call today expressing genuine concern (not sales-driven). 2. Prepare 2-3 exclusive off-market opportunities that match his stated criteria. 3. Frame outreach as: "Something exceptional just came to market that I thought of you for." 4. If no response within 72 hours, attempt email with visual content.' },
  { id: 'rec4', clientId: 'c2', urgency: 'Act', category: 'Property', title: 'Deliver yield analysis to Chen Wei', description: 'Client requested Marina Tower yield projections 48 hours ago. Analytical buyers who do not receive requested data within their expected window (24-48 hours) show a 35% drop in engagement. He has submitted 6 yield requests in 14 days, confirming ROI-first decision framework.', createdAt: '2026-03-07T08:00:00Z', matchId: 'm3', propertyId: 'p2', timeframe: 'Within 24 hours', expectedOutcome: 'Maintain trust and advance to viewing stage. Analytical clients who receive data promptly show 2.3x higher conversion rates. Expected: he reviews data for 3-4 days, then requests viewing.', confidence: 0.79, impact: 'High', relatedReportId: 'rpt3', whyNow: 'He requested this data 48 hours ago. Analytical archetypes (Detail Orientation 95/100) track response times and use them as a proxy for advisor competence. Delayed delivery beyond 72 hours historically triggers advisor-switch behavior in 35% of analytical clients.', clientContext: 'Analytical archetype. Decision Velocity 35/100 means he will not rush regardless, but delayed data creates trust erosion. He is comparing Marina yield against his Shanghai portfolio (3.2% avg). The 5.8% gross yield should be presented with full comparable context.', nextSteps: '1. Complete ROI matrix: comparable rental yields, occupancy rates, service charge projections, 3-year appreciation scenarios. 2. Include direct comparison against Shanghai portfolio returns (3.2% vs 5.8%). 3. Send via email with structured PDF format. 4. Do NOT push for viewing in the same communication.' },
  { id: 'rec5', clientId: 'c7', urgency: 'Act', category: 'Property', title: 'Close Dubois negotiation with furniture bridge', description: 'Active negotiation stalled at AED 160M (client) vs AED 170M (seller) for 6 days. Dubois\'s decisive archetype typically resolves within 10 days. The furniture package bridge (AED 8-10M included at AED 165M headline) can break the impasse without raising the headline number.', createdAt: '2026-03-06T10:00:00Z', matchId: 'm8', propertyId: 'p10', timeframe: 'This week', expectedOutcome: 'Close at AED 165M effective (AED 155M + AED 10M furniture). CRITICAL NETWORK EFFECT: Dubois is connected to Al Maktoum via Monaco Yacht Club. A successful close could trigger social proof signaling worth AED 345M combined pipeline.', confidence: 0.88, impact: 'High', relatedReportId: 'rpt4', whyNow: 'Day 6 of negotiation. His archetype\'s typical resolution window is 10 days. The seller has indicated flexibility on package inclusions. His daughter\'s school enrollment in September 2026 creates genuine relocation urgency.', clientContext: 'Decisive archetype (Decision Velocity 90/100). Negotiates firmly but seeks win-win. High Loyalty Tendency (70/100) confirmed by unprompted referral of Francois Leclerc. He needs a "win narrative" -- frame the furniture package as getting more for less.', nextSteps: '1. Present AED 165M with furniture + art package as "final best offer" this week. 2. Frame: "We secured AED 5M in premium furnishings at no additional cost." 3. Emphasize school enrollment timeline. 4. If closed, immediately prepare Al Maktoum social proof presentation.' },

  // ── MONITOR ──────────────────────────────────────────────
  { id: 'rec6', clientId: 'c11', urgency: 'Monitor', category: 'Property', title: 'Track Dr. Kim counter-offer response', description: 'AED 45M offer submitted for Downtown Residences #4. Seller response expected within 3-5 days. Counter-tolerance modeled at AED 46.5M. She has a Seoul business trip March 18 creating a natural decision deadline.', createdAt: '2026-03-06T08:00:00Z', matchId: 'm7', propertyId: 'p4', timeframe: 'Next 3-5 days', expectedOutcome: 'Seller counter-offer at AED 46-47M. Close at AED 46M with justification package. 78% close probability within 10 days.', confidence: 0.86, impact: 'High', relatedReportId: 'rpt7', whyNow: 'Offer is live and seller is deliberating. No action needed from broker yet, but counter-offer strategy must be ready the moment the seller responds. Her Seoul trip deadline compresses the negotiation window.', clientContext: 'Analytical archetype (Detail Orientation 95/100). Pre-commitment signals confirmed: call duration +40%, unprompted document submission, inquiry specificity escalating to HVAC and ceiling height details. She will negotiate methodically, not emotionally.', nextSteps: '1. Prepare counter at AED 46M with full justification (3 comparable transactions, view premium analysis). 2. Include building specs she has not yet requested to demonstrate thoroughness. 3. Monitor seller communication daily. 4. Be ready to present counter within 4 hours of seller response.' },
  { id: 'rec7', clientId: 'c6', urgency: 'Monitor', category: 'Portfolio', title: 'Track Van der Berg lifestyle pivot momentum', description: 'Client budget expanded 40% (AED 40-60M to AED 60-80M) after Bluewaters developer event. Readiness at 0.81 and accelerating at 7.0 signals/week. Impulsive archetypes have ~2 week enthusiasm windows.', createdAt: '2026-03-06T08:00:00Z', matchId: 'm6', propertyId: 'p5', timeframe: '2 weeks', expectedOutcome: 'Maintain acquisition momentum through the enthusiasm window. If readiness exceeds 0.85, transition from Monitor to Act and push for viewing. AED 75M opportunity.', confidence: 0.80, impact: 'High', relatedReportId: 'rpt6', whyNow: 'His emotional enthusiasm could fade if not channeled into action within the 2-week window. Current momentum is strong (7.0 sig/week, up from 4.2 baseline) but impulsive archetypes have shorter commitment windows than analytical ones.', clientContext: 'Impulsive archetype. Emotional Driver 85/100, Status Orientation 90/100. He mentioned "wanting a place that impresses my clients" revealing dual motivation: lifestyle + business hospitality. Cape Town penthouse sold for AED 45M last quarter, freeing liquidity.', nextSteps: '1. Monitor engagement signals daily. 2. When readiness hits 0.85+, immediately arrange sunset viewing with dinner at Bluewaters beach club. 3. Prepare client-entertainment angle he raised as part of the lifestyle narrative. 4. Do NOT present ROI data unless he asks.' },
  { id: 'rec8', clientId: 'c18', urgency: 'Monitor', category: 'Relationship', title: 'Watch Ivanov engagement trend', description: 'Engagement velocity down 52% from baseline. Not yet at critical levels but trending toward the danger zone. He is also connected to Petrova (influence score 0.75), making his relationship strategically important beyond his own pipeline value.', createdAt: '2026-03-05T08:00:00Z', timeframe: '1-2 weeks', expectedOutcome: 'Prevent further decay and stabilize engagement. If engagement stabilizes, maintain as warm relationship for Petrova re-engagement channel. His network value exceeds his direct pipeline value.', confidence: 0.68, impact: 'Medium', whyNow: '-52% velocity is a warning signal but not yet critical. If decline continues for another 2 weeks, it will cross into the "cold" threshold. Early intervention is significantly more effective than recovery from cold status.', clientContext: 'His primary value in the current context is as the Petrova re-engagement channel (influence 0.75). A casual social touchpoint through Ivanov is the safest way to restart Petrova dialogue. Maintaining this relationship serves a dual purpose.', nextSteps: '1. Schedule casual check-in call this week (non-sales). 2. Share interesting market insight or event invitation. 3. If conversation flows well, casually mention you are working with someone who shares Petrova\'s wellness interests. 4. Do not force any property discussion.' },
  { id: 'rec9', clientId: 'c10', urgency: 'Monitor', category: 'Property', title: 'Watch Moretti third visit timing', description: 'Sofia Moretti has visited Marina Penthouse twice in 10 days (55+ min each). Engine detects "emotional anchoring" pattern that precedes purchase in 73% of lifestyle buyer cases. Awaiting signal for third visit request.', createdAt: '2026-03-05T08:00:00Z', matchId: 'm4', propertyId: 'p2', timeframe: '1 week', expectedOutcome: 'Third visit triggers furnishing walkthrough and moves to offer within 48 hours. Expected close at AED 50-52M. Her Decision Velocity (95/100) means once she decides, it happens fast.', confidence: 0.78, impact: 'High', relatedReportId: 'rpt5', whyNow: 'Two visits with escalating engagement (photographed kitchen 3x, discussed hosting dinner parties, brought friend for social proof). The emotional anchoring pattern is confirmed. A third visit typically happens within 7-10 days of the second for this archetype.', clientContext: 'Impulsive lifestyle buyer. Emotional Driver 85/100. She has mentally moved in. Her partner\'s CEO promotion projects +30-40% household income. Family office in Milan holds AED 180M liquid. Do NOT show alternatives as it dilutes emotional attachment.', nextSteps: '1. Wait for her to initiate third visit (do not push). 2. When she does, prepare curated furnishing package with 3 interior design options. 3. Frame visit as "securing your home" not "viewing a property." 4. Have offer documentation ready to present within 48 hours of third visit.' },

  // ── PREPARE ──────────────────────────────────────────────
  { id: 'rec10', clientId: 'c5', urgency: 'Prepare', category: 'Market', title: 'Build commercial portfolio for Yamamoto', description: 'Client exploring commercial diversification. His Tokyo financial advisor recommends a dual-track approach (commercial + residential), which extends his residential timeline by 4-6 weeks. Prepare curated commercial selection so residential anchor can follow.', createdAt: '2026-03-04T08:00:00Z', matchId: 'm9', propertyId: 'p4', timeframe: '2-3 weeks', expectedOutcome: 'Commercial selection advances his portfolio strategy. Once commercial track progresses, position Downtown Residences #4 (AED 45M) as the residential anchor. Combined pipeline: AED 80-120M.', confidence: 0.71, impact: 'Medium', relatedReportId: 'rpt14', whyNow: 'His commercial evaluation is underway. The residential opportunity (Downtown #4) is being held in reserve per strategy. Preparing the commercial portfolio now ensures seamless transition when he is ready, and demonstrates advisory competence across asset classes.', clientContext: 'Analytical archetype (Detail Orientation 90/100, Risk Tolerance 40/100). Japanese UHNW investors: 85% add premium residential within 3 months of commercial acquisition. His Tokyo advisor is the primary influencer. Do not override their sequencing.', nextSteps: '1. Research and curate 3-5 commercial properties in DIFC and Business Bay. 2. Prepare each with institutional-grade documentation matching his analytical style. 3. Share market reports and PCIS event invitations to maintain engagement. 4. Hold Downtown #4 presentation until commercial track concludes.' },
  { id: 'rec11', clientId: 'c4', urgency: 'Prepare', category: 'Property', title: 'Prepare O\'Brien DIFC comparison matrix', description: 'James O\'Brien requires 5 comparable viewings before considering commitment. He is currently at property #3. Two more viewings of DIFC/Business Bay properties needed before presenting the structured comparison matrix that positions DIFC Living Tower as the data-driven winner.', createdAt: '2026-03-04T08:00:00Z', matchId: 'm5', propertyId: 'p9', timeframe: '2-4 weeks', expectedOutcome: 'After 5th viewing, present comparison matrix. DIFC Living Tower should emerge as clear winner on his stated criteria (walk-to-work, yield, service charges). Expected decision within 2 weeks of matrix delivery.', confidence: 0.68, impact: 'Medium', whyNow: 'He has a fixed decision process: 5 viewings minimum. Trying to close before threshold is reached will trigger resistance. Use the preparation time to build the most compelling comparison matrix possible.', clientContext: 'Balanced cognitive profile (all dimensions 55-65). Methodical, not easily excited. Requires structured comparison. Also evaluating Emirates Hills in parallel, extending decision cycle by 2-3 weeks. This is normal for balanced profiles, not a disengagement signal.', nextSteps: '1. Schedule 2 more viewings of comparable DIFC/Business Bay properties. 2. Build structured comparison matrix ranking all 5 properties on his stated criteria. 3. Position DIFC Living Tower as the data-driven winner. 4. Lead with spreadsheets and numbers. Do not use emotional framing.' },
  { id: 'rec12', clientId: 'c7', urgency: 'Prepare', category: 'Relationship', title: 'Prepare Leclerc welcome package (Dubois referral)', description: 'Marc Dubois referred Francois Leclerc (UHNW, Paris). This unprompted referral is a powerful trust signal (Loyalty Tendency 70/100). Prepare a warm introduction package that reflects the quality of the Dubois advisory relationship.', createdAt: '2026-03-04T08:00:00Z', timeframe: '1-2 weeks', expectedOutcome: 'Successful onboarding of new UHNW client through the strongest referral channel. Leclerc\'s profile suggests AED 50-80M investment appetite. A quality welcome experience reinforces Dubois\'s loyalty and generates further referral potential.', confidence: 0.75, impact: 'Medium', whyNow: 'Referrals from satisfied clients convert at 4x the rate of cold introductions. The Dubois relationship is at peak trust. A delayed or generic response to his referral would damage that trust. Leclerc expects a premium, personalized experience.', clientContext: 'Leclerc is a Paris-based UHNW individual. Dubois described him as interested in "Dubai lifestyle with investment upside." Initial profile suggests a balanced archetype between lifestyle and investment motivations. French-language communication may be preferred.', nextSteps: '1. Research Leclerc background via available channels. 2. Prepare personalized welcome package with 3-4 curated properties spanning lifestyle and investment. 3. Include market overview tailored to French UHNW buyer perspective. 4. Coordinate introduction timing with Dubois for maximum social proof.' },
  { id: 'rec13', clientId: 'c8', urgency: 'Prepare', category: 'Property', title: 'Prepare Al Rashid WhatsApp video presentation', description: 'Omar Al Rashid\'s browsing telemetry shows 3 Palm-specific sessions this week (8-12 min each). He responds to visual content 3x faster than text. Prepare a cinematic video walkthrough of Palm Signature Villa for WhatsApp delivery during evening hours.', createdAt: '2026-03-04T08:00:00Z', matchId: 'm10', propertyId: 'p6', timeframe: '1 week', expectedOutcome: 'Visual content triggers transition from browsing to viewing. His conversion pattern shows visual engagement leads to viewing request within 5-7 days. AED 135M opportunity.', confidence: 0.72, impact: 'High', relatedReportId: 'rpt11', whyNow: 'His browsing velocity accelerated from 1/week in February to 3/week now. This trajectory projects viewing-ready status within 2 weeks if engagement continues. Preparing the video now ensures we capture the window when it opens.', clientContext: 'Balanced profile with "aspirational concealment" -- presents as pure investor but browsing clusters on lifestyle properties. 4 children aged 6-14 suggest family lifestyle is a latent priority. Best reached via WhatsApp during 8-10pm UAE. Prefers visual content.', nextSteps: '1. Commission or compile cinematic video walkthrough of Palm Signature Villa. 2. Frame with investment thesis overlay (appreciation data, scarcity, yield). 3. Send via WhatsApp between 8-10pm UAE time. 4. Suggest "no-commitment private tour at your convenience" if he responds positively.' },
  { id: 'rec14', clientId: 'c12', urgency: 'Prepare', category: 'Property', title: 'Prepare Patel Al Barari pivot presentation', description: 'Priya Patel\'s Creek Harbour viewing detected noise concerns. She has been silent 14 days. Engine identified Al Barari Sanctuary as 22% stronger fit on wellness dimensions. Prepare the comparative analysis to position the pivot as proactive advisory.', createdAt: '2026-03-03T08:00:00Z', matchId: 'm11', propertyId: 'p8', timeframe: '1-2 weeks', expectedOutcome: 'Demonstrate responsive advisory and rebuild momentum. Al Barari viewing scheduled within 7 days of presentation. Transition from stalled Creek Harbour to active Al Barari pipeline.', confidence: 0.62, impact: 'Medium', relatedReportId: 'rpt8', whyNow: 'Her engagement dropped from 3.2 to 1.1 signals/week after the noise concern. She is not yet lost but momentum is fading. The Al Barari pivot gives a genuine reason to re-engage and shows we listened to her feedback.', clientContext: 'Balanced archetype with strong wellness orientation (yoga, green spaces, quiet environment). Her noise sensitivity is genuine, not a negotiation tactic. Creek Harbour has active construction within 500m through 2027. Al Barari: zero construction within 1km, tropical gardens, 40% lower ambient noise.', nextSteps: '1. Build side-by-side comparison: noise profiles, wellness amenities, 3-year construction timeline overlay. 2. Position as: "After your feedback, we identified something better aligned with your wellness priorities." 3. Send comparison first, then suggest Al Barari viewing. 4. Schedule viewing within 7 days of positive response.' },
]

// ============================================================
// ADVISOR PERFORMANCE
// ============================================================

export const advisorPerformance: AdvisorPerformance = {
  flyWheelScore: 84,
  signalsFed: 47,
  actionsTaken: 12,
  matchesPresented: 18,
  reportsGenerated: 6,
  recommendationsActedOn: 12,
  recommendationsTotal: 15,
  alertsAcknowledged: 9,
  alertsTotal: 11,
  conversionRate: 0.34,
  weeklyTrend: [68, 72, 75, 78, 80, 82, 84],
}

// ============================================================
// ACTIVITY RECORDS — interaction history
// ============================================================

export const activities: ActivityRecord[] = [
  { id: 'act1', clientId: 'c1', type: 'call', title: 'Property discussion', content: 'Discussed Palm Villa #8 details and price expectations. Client very enthusiastic about the beachfront location.', timestamp: '2026-03-03T16:00:00Z', duration: 22, outcome: 'positive' },
  { id: 'act2', clientId: 'c1', type: 'meeting', title: 'In-person showing', content: 'Conducted private showing of Palm Villa #8 with family. Wife loved the cinema room. Children excited about pool.', timestamp: '2026-03-02T11:00:00Z', duration: 90, outcome: 'positive', attendees: ['Ahmed Al Maktoum', 'Fatima Al Maktoum'] },
  { id: 'act3', clientId: 'c2', type: 'email', title: 'Yield analysis sent', content: 'Sent comprehensive yield analysis for Marina Tower units. Included 5-year ROI projections and rental comparables.', timestamp: '2026-03-03T09:00:00Z', outcome: 'neutral' },
  { id: 'act4', clientId: 'c2', type: 'call', title: 'Follow-up on analysis', content: 'Chen Wei reviewed yield analysis. Requesting additional data on occupancy rates and management fees.', timestamp: '2026-03-03T14:30:00Z', duration: 15, outcome: 'positive' },
  { id: 'act5', clientId: 'c3', type: 'call', title: 'Re-engagement attempt', content: 'Called Elena to check in. No answer — left voicemail about new lifestyle properties in Bluewaters.', timestamp: '2026-02-20T10:00:00Z', duration: 2, outcome: 'negative' },
  { id: 'act6', clientId: 'c3', type: 'email', title: 'New listings curated', content: 'Sent curated selection of 5 lifestyle properties matching her preferences. Included virtual tour links.', timestamp: '2026-02-22T11:00:00Z', outcome: 'neutral' },
  { id: 'act7', clientId: 'c4', type: 'meeting', title: 'Portfolio review', content: 'Reviewed current portfolio performance and discussed expansion strategy. Interested in Emirates Hills.', timestamp: '2026-02-28T14:00:00Z', duration: 60, outcome: 'positive', attendees: ['James O\'Brien'] },
  { id: 'act8', clientId: 'c6', type: 'call', title: 'Budget discussion', content: 'Sophie mentioned she is willing to go higher. Now considering AED 60-80M range for the right property.', timestamp: '2026-03-02T09:00:00Z', duration: 18, outcome: 'positive' },
  { id: 'act9', clientId: 'c7', type: 'meeting', title: 'Negotiation session', content: 'Met with Marc to discuss counter-offer strategy for Jumeirah Bay Mansion. Seller came back at AED 170M.', timestamp: '2026-02-28T15:00:00Z', duration: 45, outcome: 'neutral', attendees: ['Marc Dubois', 'Legal team'] },
  { id: 'act10', clientId: 'c8', type: 'call', title: 'Market update call', content: 'Khalid asked about new Palm Jumeirah listings. Interested in investment-grade properties.', timestamp: '2026-03-01T11:00:00Z', duration: 12, outcome: 'positive' },
  { id: 'act11', clientId: 'c10', type: 'meeting', title: 'Second viewing', content: 'Isabella visited Marina Tower Penthouse for the second time. Asked about furnishing packages and move-in timeline.', timestamp: '2026-03-01T16:00:00Z', duration: 75, outcome: 'positive', attendees: ['Isabella Moretti'] },
  { id: 'act12', clientId: 'c11', type: 'call', title: 'Offer preparation', content: 'Discussed offer strategy for Downtown Sky Collection. David wants to start at AED 43M.', timestamp: '2026-03-03T10:00:00Z', duration: 20, outcome: 'positive' },
  { id: 'act13', clientId: 'c11', type: 'document', title: 'Offer letter submitted', content: 'Submitted formal offer letter at AED 45M for Downtown Sky Collection penthouse.', timestamp: '2026-03-03T15:00:00Z' },
  { id: 'act14', clientId: 'c12', type: 'meeting', title: 'Business Bay viewing', content: 'Priya toured Business Bay tower unit. Liked the location but concerned about noise levels.', timestamp: '2026-03-02T14:00:00Z', duration: 45, outcome: 'neutral', attendees: ['Priya Patel'] },
  { id: 'act15', clientId: 'c16', type: 'meeting', title: 'Closing ceremony', content: 'Signed final purchase agreement for Palm Royal Villa. Champagne celebration at the property.', timestamp: '2026-02-28T16:00:00Z', duration: 120, outcome: 'positive', attendees: ['Takeshi Nakamura', 'Legal team', 'Developer rep'] },
  { id: 'act16', clientId: 'c5', type: 'email', title: 'Commercial options', content: 'Sent initial commercial property portfolio overview. Includes 3 DIFC units and 2 Business Bay offices.', timestamp: '2026-03-02T10:00:00Z', outcome: 'neutral' },
  { id: 'act17', clientId: 'c7', type: 'call', title: 'Referral thank you', content: 'Called Marc to thank for François Leclerc referral. Discussed updated offer strategy.', timestamp: '2026-03-02T17:00:00Z', duration: 10, outcome: 'positive' },
  { id: 'act18', clientId: 'c14', type: 'call', title: 'Introduction call', content: 'Initial discovery call with Emma. Strong interest in investment properties. Prefers Downtown or Marina.', timestamp: '2026-02-20T10:00:00Z', duration: 25, outcome: 'positive' },
  { id: 'act19', clientId: 'c21', type: 'email', title: 'Check-in email', content: 'Sent casual check-in email to Hans. Mentioned exclusive off-market opportunity in Zurich-style community.', timestamp: '2026-02-15T09:00:00Z', outcome: 'neutral' },
  { id: 'act20', clientId: 'c21', type: 'call', title: 'No response follow-up', content: 'Called Hans — went to voicemail. Third attempt this month. Flagged as potential flight risk.', timestamp: '2026-02-25T14:00:00Z', duration: 1, outcome: 'negative' },
  { id: 'act21', clientId: 'c9', type: 'email', title: 'Market report', content: 'Sent monthly Dubai property market report with portfolio analysis for Klaus.', timestamp: '2026-02-18T08:00:00Z', outcome: 'neutral' },
  { id: 'act22', clientId: 'c13', type: 'call', title: 'Lifestyle preferences', content: 'Lucas discussed beach lifestyle preferences. Interested in Bluewaters or Palm but budget is limiting.', timestamp: '2026-02-28T11:00:00Z', duration: 18, outcome: 'positive' },
  { id: 'act23', clientId: 'c15', type: 'email', title: 'Welcome package', content: 'Sent initial welcome package with Dubai property market overview and investment guide to Erik.', timestamp: '2026-02-12T08:00:00Z', outcome: 'neutral' },
  { id: 'act24', clientId: 'c20', type: 'meeting', title: 'Viewing — Creek Harbour', content: 'Ji-Yeon viewed Creek Harbour Tower unit. Positive reaction to the new build quality and creek views.', timestamp: '2026-02-22T11:00:00Z', duration: 60, outcome: 'positive', attendees: ['Ji-Yeon Lee'] },
]

// ============================================================
// NEXT TOUCH — scheduled follow-ups
// ============================================================

export const nextTouches: NextTouch[] = [
  { clientId: 'c1', date: '2026-03-05T10:00:00Z', reason: 'Present Palm Villa #8 offer package', type: 'meeting' },
  { clientId: 'c2', date: '2026-03-06T14:00:00Z', reason: 'Review yield analysis follow-up', type: 'call' },
  { clientId: 'c3', date: '2026-03-01T10:00:00Z', reason: 'Re-engagement call — 3 weeks overdue', type: 'call' },
  { clientId: 'c4', date: '2026-03-05T14:00:00Z', reason: 'Emirates Hills viewing', type: 'viewing' },
  { clientId: 'c5', date: '2026-03-07T11:00:00Z', reason: 'Commercial portfolio presentation', type: 'meeting' },
  { clientId: 'c6', date: '2026-03-06T09:00:00Z', reason: 'Premium tier property tour', type: 'viewing' },
  { clientId: 'c7', date: '2026-03-04T15:00:00Z', reason: 'Counter-offer discussion', type: 'call' },
  { clientId: 'c8', date: '2026-03-08T10:00:00Z', reason: 'New Palm listings walkthrough', type: 'viewing' },
  { clientId: 'c9', date: '2026-03-10T14:00:00Z', reason: 'Monthly portfolio check-in', type: 'call' },
  { clientId: 'c10', date: '2026-03-04T16:00:00Z', reason: 'Discuss offer terms for Marina Tower', type: 'meeting' },
  { clientId: 'c11', date: '2026-03-04T11:00:00Z', reason: 'Monitor offer response from seller', type: 'call' },
  { clientId: 'c12', date: '2026-03-07T09:00:00Z', reason: 'Address noise concerns — alternative options', type: 'email' },
  { clientId: 'c13', date: '2026-03-09T10:00:00Z', reason: 'Bluewaters virtual tour', type: 'viewing' },
  { clientId: 'c14', date: '2026-03-06T10:00:00Z', reason: 'Send curated investment shortlist', type: 'email' },
  { clientId: 'c15', date: '2026-03-12T14:00:00Z', reason: 'Discovery call — understand investment goals', type: 'call' },
  { clientId: 'c16', date: '2026-03-15T10:00:00Z', reason: 'Post-purchase satisfaction check', type: 'call' },
  { clientId: 'c17', date: '2026-02-20T10:00:00Z', reason: 'Initial discovery call', type: 'call' },
  { clientId: 'c18', date: '2026-02-25T14:00:00Z', reason: 'Engagement recovery meeting', type: 'meeting' },
  { clientId: 'c19', date: '2026-02-15T09:00:00Z', reason: 'Check-in on interest level', type: 'call' },
  { clientId: 'c20', date: '2026-03-08T11:00:00Z', reason: 'Creek Harbour — second viewing', type: 'viewing' },
  { clientId: 'c21', date: '2026-02-10T10:00:00Z', reason: 'Urgent re-engagement — flight risk', type: 'call' },
  { clientId: 'c22', date: '2026-02-18T14:00:00Z', reason: 'Send market overview', type: 'email' },
  { clientId: 'c23', date: '2026-01-20T09:00:00Z', reason: 'Wake-up call — dormant 60+ days', type: 'call' },
  { clientId: 'c24', date: '2026-02-01T10:00:00Z', reason: 'Introduction call', type: 'call' },
]

// ============================================================
// CLIENT NOTES — advisor journal entries
// ============================================================

export const clientNotes: ClientNote[] = [
  { id: 'n1', clientId: 'c1', timestamp: '2026-03-03T18:30:00Z', content: 'Ahmed\'s wife Fatima is the key decision-maker for the family home. She loved the cinema room at Palm Villa #8. Focus presentations on lifestyle and family features, not just investment value.', tags: ['family-decision', 'personal-preference'], isPinned: true },
  { id: 'n2', clientId: 'c1', timestamp: '2026-03-02T12:00:00Z', content: 'Ahmed mentioned they want to be settled before Ramadan. This gives us roughly 3 weeks to close. Urgency is real but don\'t pressure — he responds better to exclusivity framing.', tags: ['timeline', 'negotiation-strategy'], isPinned: true },
  { id: 'n3', clientId: 'c2', timestamp: '2026-03-03T15:00:00Z', content: 'Chen Wei is extremely data-driven. Never pitch emotionally. Always lead with numbers, yield projections, and market comparables. He checks everything twice.', tags: ['personal-preference', 'communication'], isPinned: true },
  { id: 'n4', clientId: 'c3', timestamp: '2026-02-20T10:30:00Z', content: 'Elena didn\'t answer my call. She might be losing interest or found another agent. Need to create urgency without being pushy. Her friend Sergei (c18) might be able to help re-engage her.', tags: ['concern', 'relationship'], isPinned: false },
  { id: 'n5', clientId: 'c4', timestamp: '2026-02-28T15:00:00Z', content: 'James is methodical — wants to see at least 5 comparable properties before making any decision. Currently on property #3. Schedule 2 more viewings this week.', tags: ['personal-preference'], isPinned: false },
  { id: 'n6', clientId: 'c6', timestamp: '2026-03-02T10:00:00Z', content: 'Sophie\'s budget increase is significant — she\'s now in premium territory. Her partner was recently promoted to CEO of their family business. Money is no longer the constraint; finding the right lifestyle fit is.', tags: ['financial-change', 'personal-preference'], isPinned: true },
  { id: 'n7', clientId: 'c7', timestamp: '2026-02-28T16:00:00Z', content: 'Negotiation with Marc getting complex. Seller wants AED 170M, Marc\'s max is 160M. There might be room at 165M if we include furniture package. Marc\'s lawyer is tough but fair.', tags: ['negotiation-strategy'], isPinned: true },
  { id: 'n8', clientId: 'c10', timestamp: '2026-03-01T17:00:00Z', content: 'Isabella is emotionally attached to the Marina penthouse view. Second visit she brought a friend who also loved it. Social proof is working. Don\'t show her alternatives — close this one.', tags: ['personal-preference', 'negotiation-strategy'], isPinned: false },
  { id: 'n9', clientId: 'c11', timestamp: '2026-03-03T16:00:00Z', content: 'David\'s offer at 45M is aggressive but fair for the current market. Seller might counter at 48M. David said he can go to 46.5M max. Keep this in reserve.', tags: ['negotiation-strategy', 'financial-change'], isPinned: true },
  { id: 'n10', clientId: 'c16', timestamp: '2026-02-28T18:00:00Z', content: 'Takeshi closing went perfectly. He\'s already asking about a second property for his daughter. This could become a family portfolio play — nurture the relationship.', tags: ['upsell-opportunity', 'relationship'], isPinned: true },
  { id: 'n11', clientId: 'c21', timestamp: '2026-02-25T15:00:00Z', content: 'Hans is completely unresponsive. Three calls, two emails — nothing. Might be dealing with something personal. Consider reaching out through Klaus (c9) who referred him.', tags: ['concern', 'relationship'], isPinned: false },
  { id: 'n12', clientId: 'c5', timestamp: '2026-03-02T11:00:00Z', content: 'Yuki shifting from residential-only to mixed portfolio. His Tokyo-based advisor recommended Dubai commercial. Prepare DIFC and Business Bay options — he values location above all.', tags: ['personal-preference', 'market-insight'], isPinned: false },
  { id: 'n13', clientId: 'c8', timestamp: '2026-03-01T12:00:00Z', content: 'Khalid prefers WhatsApp over email for quick updates. Doesn\'t like phone calls during business hours (9-5 Riyadh time). Best reached evenings UAE time.', tags: ['communication', 'personal-preference'], isPinned: true },
  { id: 'n14', clientId: 'c12', timestamp: '2026-03-02T15:00:00Z', content: 'Priya\'s noise concern about Business Bay is valid. The construction nearby won\'t finish until 2027. Prepare quieter alternatives — Al Barari or Creek Harbour could work.', tags: ['concern', 'market-insight'], isPinned: false },
  { id: 'n15', clientId: 'c14', timestamp: '2026-02-20T11:00:00Z', content: 'Emma prefers morning calls (NYC time) before her trading day starts. Very analytical — wants Bloomberg-level data for every property. Loves our dashboard approach.', tags: ['personal-preference', 'communication'], isPinned: false },
]

// ============================================================
// HELPER: get data by client ID
// ============================================================

export function getClient(id: string) { return clients.find(c => c.id === id) }
export function getProfile(clientId: string) { return cognitiveProfiles.find(p => p.clientId === clientId) }
export function getEngagement(clientId: string) { return engagementMetrics.find(e => e.clientId === clientId) }
export function getClientPredictions(clientId: string) { return predictions.filter(p => p.clientId === clientId) }
export function getClientRelationships(clientId: string) { return relationships.filter(r => r.fromClientId === clientId || r.toClientId === clientId) }
export function getClientSignals(clientId: string) { return signals.filter(s => s.clientId === clientId) }
export function getClientMatches(clientId: string) { return matches.filter(m => m.clientId === clientId) }
export function getClientRecommendations(clientId: string) { return recommendations.filter(r => r.clientId === clientId) }
export function getProperty(id: string) { return properties.find(p => p.id === id) }
export function getLifecycle(clientId: string) { return lifecycleData.find(l => l.clientId === clientId) }

// Aggregated helpers for dashboard/pages
export function getDecayAlerts() {
  return engagementMetrics
    .filter(e => e.status === 'cooling' || e.status === 'cold')
    .sort((a, b) => b.daysSinceContact - a.daysSinceContact)
}

export function getBookHealth() {
  const statuses = engagementMetrics.reduce((acc, e) => {
    acc[e.status] = (acc[e.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  const healthy = (statuses.thriving || 0) + (statuses.active || 0)
  return {
    total: clients.length,
    ...statuses,
    healthPercent: Math.round((healthy / clients.length) * 100),
  }
}

export function getHotPredictions() {
  return predictions
    .filter(p => p.confidence >= 70)
    .sort((a, b) => b.confidence - a.confidence)
}

export function getActRecommendations() {
  return recommendations.filter(r => r.urgency === 'Act')
}

// New CRM feature helpers
export function getClientActivities(clientId: string) {
  return activities.filter(a => a.clientId === clientId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

export function getNextTouch(clientId: string) {
  return nextTouches.find(t => t.clientId === clientId)
}

export function getClientNotes(clientId: string) {
  return clientNotes.filter(n => n.clientId === clientId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

export function getOverdueClients() {
  const now = new Date()
  return nextTouches
    .filter(t => new Date(t.date) < now)
    .map(t => ({ client: getClient(t.clientId)!, touch: t, daysOverdue: Math.floor((now.getTime() - new Date(t.date).getTime()) / 86400000) }))
    .filter(t => t.client)
    .sort((a, b) => b.daysOverdue - a.daysOverdue)
}

export function getPipelineStats() {
  const stages: Record<DealStage, { count: number }> = {
    'Lead In': { count: 0 },
    'Discovery': { count: 0 },
    'Viewing': { count: 0 },
    'Offer Made': { count: 0 },
    'Negotiation': { count: 0 },
    'Closed Won': { count: 0 },
  }
  clients.forEach(c => {
    stages[c.dealStage].count++
  })
  return stages
}

// ============================================================
// PREDICTION INTELLIGENCE — computation helpers
// ============================================================

export const PREDICTION_PATTERN_LIST: PredictionPattern[] = [
  'Imminent Purchase', 'Analysis Paralysis', 'Price Negotiation',
  'Trust Erosion', 'Portfolio Expansion', 'Flight Risk', 'Upsell Opportunity',
]

export const predictionPatternColors: Record<PredictionPattern, string> = {
  'Imminent Purchase': '#22c55e',
  'Analysis Paralysis': '#f59e0b',
  'Price Negotiation': '#06b6d4',
  'Trust Erosion': '#ef4444',
  'Portfolio Expansion': '#a78bfa',
  'Flight Risk': '#ef4444',
  'Upsell Opportunity': '#d4a574',
}

export function computeUrgencyScore(pred: Prediction): number {
  const eng = getEngagement(pred.clientId)
  const touch = getNextTouch(pred.clientId)
  const momentumMult = pred.momentum === 'heating' ? 1.3 : pred.momentum === 'cooling' ? 1.1 : 1.0
  const decayMult = eng ? 1 + (eng.decayRate / 100) : 1.0
  let overdueMult = 1.0
  if (touch) {
    const diff = Math.ceil((new Date(touch.date).getTime() - Date.now()) / 86400000)
    if (diff < 0) overdueMult = 1.0 + Math.min(Math.abs(diff) * 0.05, 0.5)
  }
  return Math.round(pred.confidence * momentumMult * decayMult * overdueMult)
}

export function buildSituationBrief(): string[] {
  const brief: string[] = []
  // High-confidence heating
  const hot = predictions.filter(p => p.confidence >= 75 && p.momentum === 'heating')
  if (hot.length > 0) {
    const names = hot.map(p => {
      const c = getClient(p.clientId)
      return `${c?.name} (${p.pattern}, ${p.confidence}%)`
    }).join(', ')
    brief.push(`${hot.length} high-confidence signal${hot.length > 1 ? 's' : ''} accelerating: ${names}.`)
  }
  // Overdue follow-ups
  const overdue = getOverdueClients()
  if (overdue.length > 0) {
    const worst = overdue[0]
    brief.push(`${overdue.length} follow-up${overdue.length > 1 ? 's' : ''} overdue — most critical: ${worst.client.name} at ${worst.daysOverdue} days.`)
  }
  // Decay alerts
  const decaying = engagementMetrics.filter(e => e.decayRate > 40 && predictions.some(p => p.clientId === e.clientId))
  if (decaying.length > 0) {
    const names = decaying.slice(0, 2).map(e => {
      const c = getClient(e.clientId)
      return `${c?.name} (${e.decayRate}% decay)`
    }).join(', ')
    brief.push(`${decaying.length} predicted client${decaying.length > 1 ? 's' : ''} showing engagement decay: ${names}.`)
  }
  // Cooling momentum warnings
  const cooling = predictions.filter(p => p.momentum === 'cooling')
  if (cooling.length > 0) {
    brief.push(`${cooling.length} pattern${cooling.length > 1 ? 's' : ''} cooling — intervention recommended before confidence drops.`)
  }
  return brief
}

export function buildPlaybook(pattern: PredictionPattern, profile: CognitiveProfile): { strategy: string; actions: string[]; risks: string[] } {
  const clientId = profile.clientId
  const eng = getEngagement(clientId)
  const touch = getNextTouch(clientId)
  const client = getClient(clientId)

  // Determine archetype from key traits
  const traits = profile.keyTraits
  const isDecisive = traits.some(t => t.toLowerCase().includes('decisive') || t.toLowerCase().includes('direct'))
  const isAnalytical = traits.some(t => t.toLowerCase().includes('analytical') || t.toLowerCase().includes('detail'))
  const isCautious = traits.some(t => t.toLowerCase().includes('risk averse') || t.toLowerCase().includes('trust dependent'))
  const isImpulsive = traits.some(t => t.toLowerCase().includes('emotionally') || t.toLowerCase().includes('fast mover'))

  // Build clear, specific action steps per pattern
  const actions: string[] = []
  let strategy = ''

  const readiness = eng ? Math.round(eng.readinessScore * 100) : 0
  const decay = eng?.decayRate ?? 0
  const daysSince = eng?.daysSinceContact ?? 0

  switch (pattern) {
    case 'Imminent Purchase':
      strategy = `Purchase window is open — ${readiness}% readiness score indicates this client is ready to move.`
      if (isDecisive) {
        actions.push('Present the final offer package — keep it concise, lead with exclusivity')
        actions.push('Frame urgency around scarcity — this profile responds to decisive timelines')
      } else if (isAnalytical) {
        actions.push('Send a complete comparison matrix — ROI projections, rental yields, market data')
        actions.push('Schedule a walkthrough focused on investment fundamentals — not emotion')
      } else if (isImpulsive) {
        actions.push('Arrange a private showing with family — emotional attachment drives this decision')
        actions.push('Highlight lifestyle benefits and status value — frame as a life upgrade')
      } else {
        actions.push('Present the offer package with a clear timeline and next steps')
        actions.push('Follow up within 48 hours — momentum is critical at this stage')
      }
      if (touch) actions.push(`Scheduled touch: ${touch.reason} — do not delay`)
      break

    case 'Analysis Paralysis':
      strategy = `Decision stalling detected — ${daysSince} days since last contact, velocity at ${eng?.currentVelocity.toFixed(1) ?? '0'}/wk.`
      if (isCautious) {
        actions.push('Reduce options to 2–3 curated choices — too many options is causing freeze')
        actions.push('Provide social proof — share anonymised success stories from similar buyers')
        actions.push('Offer a low-commitment next step — a revisit, not a decision')
      } else if (isAnalytical) {
        actions.push('Send a decision framework — side-by-side comparison with clear scoring')
        actions.push('Address remaining data gaps directly — ask what information is still missing')
      } else {
        actions.push('Simplify the decision — narrow the field to the top 2 options')
        actions.push('Set a gentle deadline — "this unit has another viewing next week"')
      }
      break

    case 'Price Negotiation':
      strategy = `Negotiation signals detected — client is preparing to make a move on pricing.`
      actions.push('Prepare your value defence — compile comparable sales and market data')
      if (isAnalytical) {
        actions.push('Lead with data — show yield projections and cost-per-sqft analysis')
      } else if (isDecisive) {
        actions.push('Present a clear bottom line — this client respects direct pricing conversations')
      } else {
        actions.push('Emphasise long-term value over short-term discount — protect your margin')
      }
      actions.push('Have a concession strategy ready — know what you can offer before the call')
      break

    case 'Trust Erosion':
      strategy = `Trust declining — engagement score dropped to ${eng?.engagementScore ?? 0}, decay at ${decay}%.`
      actions.push('Call personally — no emails, no delegation — this requires a human touch')
      actions.push('Acknowledge the gap in communication — do not pitch, just reconnect')
      if (isCautious) {
        actions.push('Offer reassurance — this profile needs to feel secure before re-engaging')
      } else {
        actions.push('Ask directly what changed — listen more than you speak')
      }
      actions.push('Schedule a face-to-face within the week — rebuild the relationship')
      break

    case 'Portfolio Expansion':
      strategy = `Expansion interest signals — client exploring beyond their current portfolio scope.`
      actions.push('Prepare a diversification presentation — show 3 options across different asset types')
      if (isAnalytical) {
        actions.push('Include yield comparisons and risk-adjusted returns for each option')
      } else if (isDecisive) {
        actions.push('Present the single strongest opportunity first — this client makes fast choices')
      } else {
        actions.push('Position expansion as the natural next step — build on existing trust')
      }
      actions.push(`Current portfolio: AED ${((client?.financialProfile.portfolioValue ?? 0) / 1_000_000).toFixed(0)}M — frame new assets as portfolio strengthening`)
      break

    case 'Flight Risk':
      strategy = `Disengagement risk — ${daysSince} days silent, ${decay}% decay rate. Urgent action required.`
      actions.push('Call within 24 hours — every day of silence increases the risk')
      actions.push('Do not pitch — ask how they are, what changed, what they need')
      if (isCautious) {
        actions.push('Offer flexibility — this client may feel pressured or uncertain')
      } else {
        actions.push('Re-establish value — remind them why they engaged in the first place')
      }
      actions.push('If unreachable by phone — send a personal, non-transactional message')
      break

    case 'Upsell Opportunity':
      strategy = `Budget expansion signals — client showing interest above their original range.`
      actions.push('Curate 2–3 premium properties within the new budget range')
      if (isImpulsive) {
        actions.push('Lead with the aspirational option — this client responds to status and lifestyle')
      } else if (isAnalytical) {
        actions.push('Show the value gap between current and premium tier — let the data sell it')
      } else {
        actions.push('Position the upgrade naturally — "based on what you have told me, you might also like..."')
      }
      actions.push('Do not reference the budget increase directly — let the client lead that conversation')
      break
  }

  return {
    strategy,
    actions,
    risks: profile.riskFactors.filter(r => r !== 'Standard monitoring'),
  }
}

export function projectDecay(clientId: string, weeks: number): number[] {
  const eng = getEngagement(clientId)
  if (!eng) return Array(weeks + 1).fill(50)
  const decay = eng.decayRate / 100
  const result = [eng.engagementScore]
  for (let i = 1; i <= weeks; i++) {
    result.push(Math.max(0, Math.round(result[i - 1] * (1 - decay * 0.25))))
  }
  return result
}

export function projectRecovery(clientId: string, weeks: number): number[] {
  const eng = getEngagement(clientId)
  if (!eng) return Array(weeks + 1).fill(50)
  const avgImpact = getAvgPositiveImpact()
  const result = [eng.engagementScore]
  for (let i = 1; i <= weeks; i++) {
    result.push(Math.min(100, Math.round(result[i - 1] + avgImpact * 0.4)))
  }
  return result
}

export function getAvgPositiveImpact(): number {
  const allDeltas = signals.flatMap(s => s.impact.map(i => i.delta)).filter(d => d > 0)
  if (allDeltas.length === 0) return 5
  return allDeltas.reduce((sum, d) => sum + d, 0) / allDeltas.length
}

export function getPatternDistribution(): Record<PredictionPattern, { count: number; avgConfidence: number; momentum: { heating: number; stable: number; cooling: number } }> {
  const dist = {} as Record<PredictionPattern, { count: number; avgConfidence: number; momentum: { heating: number; stable: number; cooling: number } }>
  PREDICTION_PATTERN_LIST.forEach(p => {
    const preds = predictions.filter(pr => pr.pattern === p)
    dist[p] = {
      count: preds.length,
      avgConfidence: preds.length > 0 ? Math.round(preds.reduce((s, pr) => s + pr.confidence, 0) / preds.length) : 0,
      momentum: {
        heating: preds.filter(pr => pr.momentum === 'heating').length,
        stable: preds.filter(pr => pr.momentum === 'stable').length,
        cooling: preds.filter(pr => pr.momentum === 'cooling').length,
      },
    }
  })
  return dist
}

// ============================================================
// BROKER NETWORK — Professional contacts & relationships
// ============================================================

export type BrokerContactRole = 'Co-Broker' | 'Referral Partner' | 'Developer' | 'Legal' | 'Finance' | 'Interior Design'

export type RelationshipTier = 'inner' | 'middle' | 'outer'

export interface BrokerContact {
  id: string
  name: string
  initials: string
  role: BrokerContactRole
  company: string
  phone: string
  email: string
  location: string
  tier: RelationshipTier
  relationshipStrength: number     // 0-100
  trustScore: number               // 0-100
  responseRate: number             // 0-1
  avgResponseTimeHrs: number
  totalDealsShared: number
  activeDeals: number
  totalReferralsIn: number
  totalReferralsOut: number
  revenueGenerated: number         // AED
  lastInteraction: string          // ISO date
  firstConnected: string           // ISO date
  interactionFrequency: number     // per month
  communicationPreference: 'WhatsApp' | 'Call' | 'Email' | 'In-Person'
  specialties: string[]
  notes: string
  momentum: MomentumDirection
}

export interface BrokerInteraction {
  id: string
  contactId: string
  date: string
  type: 'Call' | 'Meeting' | 'WhatsApp' | 'Email' | 'Deal Closed' | 'Referral Received' | 'Referral Sent' | 'Co-Listing'
  summary: string
  outcome: 'positive' | 'neutral' | 'negative'
  linkedClientId?: string           // client involved, if any
}

export interface SharedDeal {
  id: string
  contactId: string
  clientId: string
  property: string
  value: number                     // AED
  status: 'active' | 'closed' | 'lost'
  startedAt: string
  closedAt?: string
  brokerRole: 'Lead' | 'Co-Broker' | 'Referral'
  commission: number
}

export const brokerContacts: BrokerContact[] = [
  {
    id: 'bc1', name: 'Rashid Al-Mansoori', initials: 'RM', role: 'Co-Broker',
    company: 'Knight Frank', phone: '+971-55-301-4422', email: 'rashid@knightfrank.ae',
    location: 'Dubai Marina', tier: 'inner', relationshipStrength: 92, trustScore: 95,
    responseRate: 0.97, avgResponseTimeHrs: 0.5, totalDealsShared: 14, activeDeals: 3,
    totalReferralsIn: 8, totalReferralsOut: 5, revenueGenerated: 4_200_000,
    lastInteraction: '2025-05-18', firstConnected: '2019-03-10',
    interactionFrequency: 12, communicationPreference: 'WhatsApp',
    specialties: ['Ultra-luxury villas', 'Palm Jumeirah', 'Off-market deals'],
    notes: 'Closest co-broker. Handles UHNW clients together. Reliable for off-market inventory.',
    momentum: 'heating',
  },
  {
    id: 'bc2', name: 'Nadia Khoury', initials: 'NK', role: 'Referral Partner',
    company: 'Habib Bank Wealth Management', phone: '+971-50-445-9981', email: 'nadia.k@habibwm.com',
    location: 'DIFC', tier: 'inner', relationshipStrength: 88, trustScore: 91,
    responseRate: 0.92, avgResponseTimeHrs: 2.0, totalDealsShared: 6, activeDeals: 2,
    totalReferralsIn: 11, totalReferralsOut: 3, revenueGenerated: 3_800_000,
    lastInteraction: '2025-05-16', firstConnected: '2020-08-22',
    interactionFrequency: 8, communicationPreference: 'Call',
    specialties: ['UHNW portfolio advisory', 'Cross-border investments', 'Family office clients'],
    notes: 'Top referral source. Her clients are typically UHNW with AED 50M+ portfolios.',
    momentum: 'stable',
  },
  {
    id: 'bc3', name: 'Omar Hadid', initials: 'OH', role: 'Developer',
    company: 'Emaar Properties', phone: '+971-56-772-3310', email: 'omar.hadid@emaar.ae',
    location: 'Downtown Dubai', tier: 'inner', relationshipStrength: 85, trustScore: 88,
    responseRate: 0.85, avgResponseTimeHrs: 4.0, totalDealsShared: 9, activeDeals: 2,
    totalReferralsIn: 2, totalReferralsOut: 4, revenueGenerated: 6_500_000,
    lastInteraction: '2025-05-15', firstConnected: '2018-11-05',
    interactionFrequency: 6, communicationPreference: 'In-Person',
    specialties: ['Off-plan launches', 'Bulk purchase deals', 'VIP allocation access'],
    notes: 'Direct line to Emaar VIP allocations. Key relationship for off-plan inventory.',
    momentum: 'heating',
  },
  {
    id: 'bc4', name: 'Sarah Al-Hashimi', initials: 'SH', role: 'Legal',
    company: 'Al Tamimi & Company', phone: '+971-52-889-1145', email: 'sarah.h@tamimi.com',
    location: 'DIFC', tier: 'inner', relationshipStrength: 82, trustScore: 93,
    responseRate: 0.90, avgResponseTimeHrs: 3.0, totalDealsShared: 18, activeDeals: 4,
    totalReferralsIn: 1, totalReferralsOut: 2, revenueGenerated: 0,
    lastInteraction: '2025-05-19', firstConnected: '2017-06-14',
    interactionFrequency: 10, communicationPreference: 'Email',
    specialties: ['Property conveyancing', 'DIFC regulations', 'International buyer compliance'],
    notes: 'Handles all complex transactions. Fast turnaround on due diligence.',
    momentum: 'stable',
  },
  {
    id: 'bc5', name: 'Ahmed Rizvi', initials: 'AR', role: 'Co-Broker',
    company: 'Betterhomes', phone: '+971-55-612-7783', email: 'ahmed.r@betterhomes.ae',
    location: 'JBR', tier: 'middle', relationshipStrength: 71, trustScore: 74,
    responseRate: 0.80, avgResponseTimeHrs: 6.0, totalDealsShared: 5, activeDeals: 1,
    totalReferralsIn: 3, totalReferralsOut: 2, revenueGenerated: 1_200_000,
    lastInteraction: '2025-05-10', firstConnected: '2021-04-18',
    interactionFrequency: 4, communicationPreference: 'WhatsApp',
    specialties: ['Apartment sales', 'JBR corridor', 'Mid-range luxury'],
    notes: 'Good for volume. Less suited for ultra-premium but reliable in the mid segment.',
    momentum: 'stable',
  },
  {
    id: 'bc6', name: 'Layla Farouk', initials: 'LF', role: 'Interior Design',
    company: 'Studio LF Interiors', phone: '+971-50-334-8812', email: 'layla@studiolf.ae',
    location: 'Al Quoz', tier: 'middle', relationshipStrength: 68, trustScore: 80,
    responseRate: 0.88, avgResponseTimeHrs: 5.0, totalDealsShared: 0, activeDeals: 0,
    totalReferralsIn: 4, totalReferralsOut: 6, revenueGenerated: 0,
    lastInteraction: '2025-05-08', firstConnected: '2022-01-10',
    interactionFrequency: 3, communicationPreference: 'WhatsApp',
    specialties: ['Luxury staging', 'Penthouse interiors', 'Branded residences'],
    notes: 'Staging increases sale speed by 40%. Refer her for premium listings.',
    momentum: 'heating',
  },
  {
    id: 'bc7', name: 'James Crawford', initials: 'JC', role: 'Finance',
    company: 'HSBC Private Banking', phone: '+971-52-991-4470', email: 'james.crawford@hsbc.ae',
    location: 'DIFC', tier: 'middle', relationshipStrength: 65, trustScore: 78,
    responseRate: 0.75, avgResponseTimeHrs: 8.0, totalDealsShared: 3, activeDeals: 1,
    totalReferralsIn: 5, totalReferralsOut: 1, revenueGenerated: 950_000,
    lastInteraction: '2025-04-28', firstConnected: '2021-09-02',
    interactionFrequency: 2, communicationPreference: 'Email',
    specialties: ['Mortgage structuring', 'Expat financing', 'Portfolio lending'],
    notes: 'Useful for clients needing mortgage pre-approval. Slow but thorough.',
    momentum: 'cooling',
  },
  {
    id: 'bc8', name: 'Priya Menon', initials: 'PM', role: 'Referral Partner',
    company: 'Savills Dubai', phone: '+971-55-223-9901', email: 'priya.m@savills.ae',
    location: 'Business Bay', tier: 'middle', relationshipStrength: 62, trustScore: 70,
    responseRate: 0.70, avgResponseTimeHrs: 12.0, totalDealsShared: 2, activeDeals: 0,
    totalReferralsIn: 3, totalReferralsOut: 2, revenueGenerated: 680_000,
    lastInteraction: '2025-04-20', firstConnected: '2022-06-15',
    interactionFrequency: 2, communicationPreference: 'Call',
    specialties: ['Commercial-to-residential crossover', 'Indian investor network'],
    notes: 'Good Indian investor pipeline. Relationship could grow with more attention.',
    momentum: 'cooling',
  },
  {
    id: 'bc9', name: 'Viktor Petrov', initials: 'VP', role: 'Co-Broker',
    company: 'Luxhabitat', phone: '+971-56-445-0012', email: 'viktor@luxhabitat.ae',
    location: 'Emirates Hills', tier: 'outer', relationshipStrength: 45, trustScore: 55,
    responseRate: 0.60, avgResponseTimeHrs: 24.0, totalDealsShared: 1, activeDeals: 0,
    totalReferralsIn: 1, totalReferralsOut: 0, revenueGenerated: 320_000,
    lastInteraction: '2025-03-15', firstConnected: '2023-02-20',
    interactionFrequency: 1, communicationPreference: 'WhatsApp',
    specialties: ['Russian-speaking clients', 'Emirates Hills', 'Villa market'],
    notes: 'Niche CIS market. Low frequency but could be valuable for specific deals.',
    momentum: 'cooling',
  },
  {
    id: 'bc10', name: 'Fatima Al-Sayed', initials: 'FS', role: 'Developer',
    company: 'DAMAC Properties', phone: '+971-50-667-3321', email: 'fatima.s@damac.ae',
    location: 'Business Bay', tier: 'middle', relationshipStrength: 58, trustScore: 65,
    responseRate: 0.72, avgResponseTimeHrs: 10.0, totalDealsShared: 4, activeDeals: 1,
    totalReferralsIn: 0, totalReferralsOut: 3, revenueGenerated: 1_800_000,
    lastInteraction: '2025-05-05', firstConnected: '2020-11-30',
    interactionFrequency: 3, communicationPreference: 'In-Person',
    specialties: ['Branded residences', 'Versace/Cavalli towers', 'Investor bulk deals'],
    notes: 'Good for branded residence inventory. Push for better commission terms.',
    momentum: 'stable',
  },
  {
    id: 'bc11', name: 'Daniel Park', initials: 'DP', role: 'Finance',
    company: 'Emirates NBD Private', phone: '+971-52-110-5543', email: 'daniel.park@enbd.ae',
    location: 'Downtown Dubai', tier: 'outer', relationshipStrength: 40, trustScore: 60,
    responseRate: 0.65, avgResponseTimeHrs: 18.0, totalDealsShared: 1, activeDeals: 0,
    totalReferralsIn: 2, totalReferralsOut: 0, revenueGenerated: 220_000,
    lastInteraction: '2025-03-01', firstConnected: '2023-08-10',
    interactionFrequency: 1, communicationPreference: 'Email',
    specialties: ['Local buyer mortgages', 'Golden visa financing'],
    notes: 'New relationship. Could be useful for local buyer segment.',
    momentum: 'stable',
  },
  {
    id: 'bc12', name: 'Aisha Rahman', initials: 'AR2', role: 'Referral Partner',
    company: 'Henley & Partners', phone: '+971-55-887-2200', email: 'aisha@henley.com',
    location: 'DIFC', tier: 'outer', relationshipStrength: 38, trustScore: 52,
    responseRate: 0.55, avgResponseTimeHrs: 24.0, totalDealsShared: 0, activeDeals: 0,
    totalReferralsIn: 2, totalReferralsOut: 0, revenueGenerated: 150_000,
    lastInteraction: '2025-02-14', firstConnected: '2024-01-05',
    interactionFrequency: 1, communicationPreference: 'Email',
    specialties: ['Golden visa buyers', 'Citizenship-by-investment clients'],
    notes: 'Early stage. Sends golden visa seekers who need qualifying property.',
    momentum: 'cooling',
  },
]

export const brokerInteractions: BrokerInteraction[] = [
  { id: 'bi1', contactId: 'bc1', date: '2025-05-18', type: 'WhatsApp', summary: 'Discussed off-market villa listing in Palm Jumeirah. Agreed to co-list.', outcome: 'positive', linkedClientId: 'c1' },
  { id: 'bi2', contactId: 'bc1', date: '2025-05-14', type: 'Meeting', summary: 'Lunch meeting at Nobu. Reviewed Q2 pipeline and shared 3 new leads.', outcome: 'positive' },
  { id: 'bi3', contactId: 'bc1', date: '2025-05-08', type: 'Deal Closed', summary: 'Closed AED 28M villa in Emirates Hills. 60/40 split.', outcome: 'positive', linkedClientId: 'c3' },
  { id: 'bi4', contactId: 'bc2', date: '2025-05-16', type: 'Call', summary: 'Nadia referred a new UHNW client — family office from Saudi Arabia.', outcome: 'positive', linkedClientId: 'c8' },
  { id: 'bi5', contactId: 'bc2', date: '2025-05-02', type: 'Referral Received', summary: 'Received referral for investor looking at Dubai Creek Tower units.', outcome: 'positive' },
  { id: 'bi6', contactId: 'bc3', date: '2025-05-15', type: 'Meeting', summary: 'Emaar VIP event — secured early allocation for 3 units in new tower.', outcome: 'positive' },
  { id: 'bi7', contactId: 'bc3', date: '2025-05-01', type: 'Email', summary: 'Received updated price list for Address Residences Phase 2.', outcome: 'neutral' },
  { id: 'bi8', contactId: 'bc4', date: '2025-05-19', type: 'Email', summary: 'Due diligence completed on Creek Harbour penthouse. Clear to proceed.', outcome: 'positive', linkedClientId: 'c2' },
  { id: 'bi9', contactId: 'bc4', date: '2025-05-12', type: 'Call', summary: 'Discussed compliance requirements for Chinese buyer. Need additional docs.', outcome: 'neutral', linkedClientId: 'c5' },
  { id: 'bi10', contactId: 'bc5', date: '2025-05-10', type: 'WhatsApp', summary: 'Ahmed has a 2BR in JBR available off-market. Could work for investor client.', outcome: 'positive', linkedClientId: 'c4' },
  { id: 'bi11', contactId: 'bc6', date: '2025-05-08', type: 'WhatsApp', summary: 'Layla completing staging for Downtown penthouse. Photos ready Thursday.', outcome: 'positive' },
  { id: 'bi12', contactId: 'bc6', date: '2025-04-22', type: 'Referral Sent', summary: 'Referred Layla to client purchasing villa — needs full interior fit-out.', outcome: 'positive', linkedClientId: 'c1' },
  { id: 'bi13', contactId: 'bc7', date: '2025-04-28', type: 'Email', summary: 'James approved mortgage pre-qualification for expat buyer. AED 8M limit.', outcome: 'positive', linkedClientId: 'c6' },
  { id: 'bi14', contactId: 'bc7', date: '2025-04-15', type: 'Call', summary: 'Discussed interest rate changes — rates likely to drop Q3. Good for pipeline.', outcome: 'neutral' },
  { id: 'bi15', contactId: 'bc8', date: '2025-04-20', type: 'Call', summary: 'Priya mentioned 2 investors exploring Dubai. Will intro next week.', outcome: 'positive' },
  { id: 'bi16', contactId: 'bc9', date: '2025-03-15', type: 'WhatsApp', summary: 'Viktor asked about Emirates Hills listings. Sent 3 options.', outcome: 'neutral' },
  { id: 'bi17', contactId: 'bc10', date: '2025-05-05', type: 'Meeting', summary: 'DAMAC launch event. Fatima secured 2 priority units for our clients.', outcome: 'positive' },
  { id: 'bi18', contactId: 'bc11', date: '2025-03-01', type: 'Email', summary: 'Daniel sent updated golden visa mortgage products brochure.', outcome: 'neutral' },
  { id: 'bi19', contactId: 'bc12', date: '2025-02-14', type: 'Referral Received', summary: 'Aisha referred a UK family seeking AED 2M+ property for golden visa.', outcome: 'positive' },
  { id: 'bi20', contactId: 'bc1', date: '2025-04-28', type: 'Co-Listing', summary: 'Co-listed penthouse in One Palm. Joint marketing strategy agreed.', outcome: 'positive' },
]

export const sharedDeals: SharedDeal[] = [
  { id: 'sd1', contactId: 'bc1', clientId: 'c3', property: 'Villa E12, Emirates Hills', value: 28_000_000, status: 'closed', startedAt: '2025-02-10', closedAt: '2025-05-08', brokerRole: 'Lead', commission: 840_000 },
  { id: 'sd2', contactId: 'bc1', clientId: 'c1', property: 'Penthouse, One Palm', value: 45_000_000, status: 'active', startedAt: '2025-04-28', brokerRole: 'Co-Broker', commission: 0 },
  { id: 'sd3', contactId: 'bc1', clientId: 'c8', property: 'Villa B7, Palm Jumeirah', value: 32_000_000, status: 'active', startedAt: '2025-05-18', brokerRole: 'Lead', commission: 0 },
  { id: 'sd4', contactId: 'bc2', clientId: 'c8', property: 'Apt 4501, Address Sky View', value: 12_000_000, status: 'closed', startedAt: '2024-11-15', closedAt: '2025-01-20', brokerRole: 'Referral', commission: 180_000 },
  { id: 'sd5', contactId: 'bc2', clientId: 'c2', property: 'Penthouse, Creek Harbour', value: 22_000_000, status: 'active', startedAt: '2025-04-10', brokerRole: 'Lead', commission: 0 },
  { id: 'sd6', contactId: 'bc3', clientId: 'c5', property: '3x Units, Address Residences Ph2', value: 18_000_000, status: 'active', startedAt: '2025-05-15', brokerRole: 'Lead', commission: 0 },
  { id: 'sd7', contactId: 'bc4', clientId: 'c2', property: 'Penthouse, Creek Harbour (legal)', value: 22_000_000, status: 'active', startedAt: '2025-04-10', brokerRole: 'Lead', commission: 0 },
  { id: 'sd8', contactId: 'bc5', clientId: 'c4', property: 'Apt 2204, Shams 1 JBR', value: 3_500_000, status: 'active', startedAt: '2025-05-10', brokerRole: 'Co-Broker', commission: 0 },
  { id: 'sd9', contactId: 'bc7', clientId: 'c6', property: 'Villa C3, Arabian Ranches', value: 8_000_000, status: 'closed', startedAt: '2025-01-20', closedAt: '2025-03-15', brokerRole: 'Lead', commission: 240_000 },
  { id: 'sd10', contactId: 'bc10', clientId: 'c7', property: '2x Apts, Cavalli Tower', value: 14_000_000, status: 'closed', startedAt: '2024-09-01', closedAt: '2025-02-28', brokerRole: 'Lead', commission: 420_000 },
]

// Accessor helpers
export function getBrokerContact(id: string): BrokerContact | undefined { return brokerContacts.find(c => c.id === id) }
export function getContactInteractions(contactId: string): BrokerInteraction[] { return brokerInteractions.filter(i => i.contactId === contactId) }
export function getContactDeals(contactId: string): SharedDeal[] { return sharedDeals.filter(d => d.contactId === contactId) }
export function getContactsByTier(tier: RelationshipTier): BrokerContact[] { return brokerContacts.filter(c => c.tier === tier) }
export function getContactsByRole(role: BrokerContactRole): BrokerContact[] { return brokerContacts.filter(c => c.role === role) }

export const BROKER_CONTACT_ROLES: BrokerContactRole[] = ['Co-Broker', 'Referral Partner', 'Developer', 'Legal', 'Finance', 'Interior Design']

export const brokerContactRoleColors: Record<BrokerContactRole, string> = {
  'Co-Broker': '#22c55e',
  'Referral Partner': '#a78bfa',
  'Developer': '#06b6d4',
  'Legal': '#f59e0b',
  'Finance': '#3b82f6',
  'Interior Design': '#ec4899',
}

export function getBrokerNetworkStats() {
  const total = brokerContacts.length
  const inner = brokerContacts.filter(c => c.tier === 'inner').length
  const middle = brokerContacts.filter(c => c.tier === 'middle').length
  const outer = brokerContacts.filter(c => c.tier === 'outer').length
  const avgStrength = Math.round(brokerContacts.reduce((s, c) => s + c.relationshipStrength, 0) / total)
  const totalRevenue = brokerContacts.reduce((s, c) => s + c.revenueGenerated, 0)
  const totalReferralsIn = brokerContacts.reduce((s, c) => s + c.totalReferralsIn, 0)
  const totalReferralsOut = brokerContacts.reduce((s, c) => s + c.totalReferralsOut, 0)
  const activeDeals = sharedDeals.filter(d => d.status === 'active').length
  const closedDeals = sharedDeals.filter(d => d.status === 'closed').length
  const closedRevenue = sharedDeals.filter(d => d.status === 'closed').reduce((s, d) => s + d.commission, 0)
  const heatingCount = brokerContacts.filter(c => c.momentum === 'heating').length
  const coolingCount = brokerContacts.filter(c => c.momentum === 'cooling').length

  return {
    total, inner, middle, outer, avgStrength, totalRevenue,
    totalReferralsIn, totalReferralsOut, activeDeals, closedDeals,
    closedRevenue, heatingCount, coolingCount,
  }
}

// ============================================================
// MARKET INTELLIGENCE — War Room data
// ============================================================

export interface AreaMetric {
  areaName: string
  avgPricePerSqft: number
  avgPrice: number
  priceChange7d: number
  priceChange30d: number
  monthlyVolume: number
  daysOnMarket: number
  inventoryCount: number
  demandScore: number
  activeClientIds: string[]
}

export type IntelFeedType = 'New Listing' | 'Price Change' | 'Market Signal' | 'Competitive Intel' | 'Regulatory Update' | 'Developer Launch'

export interface IntelFeedItem {
  id: string
  type: IntelFeedType
  timestamp: string
  headline: string
  description: string
  relevantClientIds: string[]
  urgency: 'High' | 'Medium' | 'Low'
  tags: string[]
  metadata?: { areaName?: string; propertyId?: string; priceOld?: number; priceNew?: number }
  summary?: string       // Extended analysis with key facts
  keyFacts?: string[]    // Bullet-point key data points
  sourceUrl?: string     // Link to original article/source
  sourceName?: string    // Display name of source
}

export interface MarketMetrics {
  avgPricePerSqft: number
  monthlyTransactionVolume: number
  daysOnMarketAvg: number
  totalInventory: number
  marketSentimentScore: number
  priceHistory7d: number[]
}

export const areaMetrics: AreaMetric[] = [
  { areaName: 'Palm Jumeirah', avgPricePerSqft: 3850, avgPrice: 145_000_000, priceChange7d: 2.1, priceChange30d: 5.8, monthlyVolume: 34, daysOnMarket: 42, inventoryCount: 128, demandScore: 94, activeClientIds: ['c1', 'c7', 'c16'] },
  { areaName: 'Emirates Hills', avgPricePerSqft: 3200, avgPrice: 180_000_000, priceChange7d: 1.4, priceChange30d: 4.2, monthlyVolume: 12, daysOnMarket: 68, inventoryCount: 45, demandScore: 88, activeClientIds: ['c1', 'c7'] },
  { areaName: 'Dubai Marina', avgPricePerSqft: 2100, avgPrice: 48_000_000, priceChange7d: -0.8, priceChange30d: 1.2, monthlyVolume: 86, daysOnMarket: 28, inventoryCount: 312, demandScore: 82, activeClientIds: ['c2', 'c10', 'c14'] },
  { areaName: 'Downtown Dubai', avgPricePerSqft: 2800, avgPrice: 42_000_000, priceChange7d: 1.2, priceChange30d: 3.5, monthlyVolume: 65, daysOnMarket: 35, inventoryCount: 198, demandScore: 90, activeClientIds: ['c4', 'c11', 'c9'] },
  { areaName: 'Jumeirah Bay', avgPricePerSqft: 4200, avgPrice: 165_000_000, priceChange7d: 3.5, priceChange30d: 8.1, monthlyVolume: 8, daysOnMarket: 55, inventoryCount: 22, demandScore: 96, activeClientIds: ['c1', 'c5', 'c7', 'c16'] },
  { areaName: 'Bluewaters Island', avgPricePerSqft: 2600, avgPrice: 72_000_000, priceChange7d: 0.5, priceChange30d: 2.8, monthlyVolume: 18, daysOnMarket: 45, inventoryCount: 56, demandScore: 76, activeClientIds: ['c6', 'c3'] },
  { areaName: 'Dubai Creek', avgPricePerSqft: 1800, avgPrice: 22_000_000, priceChange7d: -1.2, priceChange30d: -0.5, monthlyVolume: 42, daysOnMarket: 52, inventoryCount: 178, demandScore: 68, activeClientIds: ['c9', 'c12'] },
  { areaName: 'DIFC', avgPricePerSqft: 2400, avgPrice: 32_000_000, priceChange7d: 0.9, priceChange30d: 2.1, monthlyVolume: 28, daysOnMarket: 38, inventoryCount: 92, demandScore: 78, activeClientIds: ['c4', 'c8'] },
  { areaName: 'Al Barari', avgPricePerSqft: 1650, avgPrice: 38_000_000, priceChange7d: 0.3, priceChange30d: 1.5, monthlyVolume: 6, daysOnMarket: 72, inventoryCount: 34, demandScore: 62, activeClientIds: ['c3'] },
]

export const intelFeed: IntelFeedItem[] = [
  { id: 'if1', type: 'New Listing', timestamp: '2026-03-06T08:30:00Z', headline: 'Palm Jumeirah tip villa hits market at AED 195M', description: 'Ultra-prime 8-bed villa with 150m private beach frontage. Direct competitor to Palm Villa #8. First tip listing in 6 months.', relevantClientIds: ['c1', 'c7'], urgency: 'High', tags: ['Palm Jumeirah', 'Ultra-Luxury', 'Villa'], metadata: { areaName: 'Palm Jumeirah', priceNew: 195_000_000 }, summary: 'A landmark new listing has emerged on the Palm Jumeirah tip — one of only 12 tip-position villas in existence. The property features 150 meters of private beach frontage, an 8-bedroom layout spanning 22,000 sqft across three levels, and was designed by Pritzker Prize-shortlisted architect Zaha Hadid\'s studio. The AED 195M asking price positions it as a direct competitor to Palm Villa #8 (AED 185M), potentially creating pricing tension in the ultra-prime Palm segment. This is the first tip listing to hit the market in over 6 months, making it a significant liquidity event for trophy buyers.', keyFacts: ['8 bedrooms, 22,000 sqft across 3 levels', '150m private beach frontage — tip position', 'AED 10,541/sqft — 5% premium to Palm avg', 'First tip listing in 6 months', 'Zaha Hadid studio design, completed 2024'], sourceUrl: 'https://www.propertyfinder.ae/en/buy/dubai/palm-jumeirah', sourceName: 'Property Finder' },
  { id: 'if2', type: 'Price Change', timestamp: '2026-03-06T07:15:00Z', headline: 'Marina Tower Penthouse reduced 8% to AED 47.8M', description: 'Full-floor penthouse in competing tower dropped asking price. Creates negotiation leverage for our Marina listing.', relevantClientIds: ['c2', 'c10'], urgency: 'High', tags: ['Dubai Marina', 'Penthouse', 'Price Drop'], metadata: { areaName: 'Dubai Marina', priceOld: 52_000_000, priceNew: 47_800_000 }, summary: 'The full-floor penthouse at Marina Heights Tower (Floor 58) has been reduced from AED 52M to AED 47.8M — an 8.1% price cut after 94 days on market. The seller, a European investment fund, is signaling urgency to exit before Q2. This creates significant negotiation leverage for buyers considering competing Marina properties. The price per sqft has dropped to AED 3,280, now below the Marina premium average of AED 3,450/sqft for penthouse units. Market data shows this is the third price reduction in the Marina penthouse segment this quarter.', keyFacts: ['Price reduced: AED 52M → AED 47.8M (−8.1%)', '94 days on market — seller motivated', 'AED 3,280/sqft — below Marina penthouse avg', 'Full floor, 14,573 sqft, 5 bed, private pool', '3rd Marina penthouse reduction this quarter'], sourceUrl: 'https://www.bayut.com/for-sale/property/dubai/marina', sourceName: 'Bayut' },
  { id: 'if3', type: 'Market Signal', timestamp: '2026-03-06T06:00:00Z', headline: 'Dubai Land Department: Q1 transactions up 23% YoY', description: 'Official DLD data confirms strong market momentum. Luxury segment (AED 10M+) outperforming mid-market by 2x.', relevantClientIds: [], urgency: 'Medium', tags: ['Market Data', 'DLD', 'Volume'], summary: 'The Dubai Land Department has released official Q1 2026 transaction data showing 12,847 transactions valued at AED 38.2 billion — a 23% increase in volume and 18.5% increase in value year-over-year. The luxury segment (properties above AED 10M) showed particular strength, with transaction counts up 44% compared to 19% growth in the sub-AED 10M segment. Palm Jumeirah and Jumeirah Bay led luxury volume, while Downtown Dubai and Dubai Marina dominated mid-luxury. Foreign buyer participation reached 44%, the highest level recorded.', keyFacts: ['12,847 transactions in Q1 — up 23% YoY', 'AED 38.2B total value — up 18.5% YoY', 'Luxury (10M+) segment: +44% vs mid-market +19%', 'Foreign buyer share: 44% — all-time high', 'Palm Jumeirah & Jumeirah Bay lead luxury volume'], sourceUrl: 'https://dxbinteract.com', sourceName: 'DXBInteract — Dubai Land Department' },
  { id: 'if4', type: 'Competitive Intel', timestamp: '2026-03-05T16:45:00Z', headline: 'Sotheby\'s hosting exclusive Emirates Hills event', description: 'Competitor organizing private viewing for 20 UHNW buyers on March 12. Three of our pipeline clients received invitations.', relevantClientIds: ['c1', 'c5', 'c7'], urgency: 'High', tags: ['Competitor', 'Emirates Hills', 'Event'], summary: 'Sotheby\'s International Realty Dubai is organizing an exclusive private viewing event at a AED 280M Emirates Hills estate on March 12. The event targets 20 pre-qualified UHNW buyers with a minimum net worth requirement of USD 50M. Intelligence suggests they are positioning three off-market properties for simultaneous reveal. The event includes a Rolls-Royce fleet transfer from DIFC and a private dinner catered by Nobu. This represents an aggressive play for the ultra-prime Emirates Hills segment where we currently hold 2 active listings.', keyFacts: ['Date: March 12, exclusive invitation only', '20 UHNW buyers invited (min. USD 50M net worth)', 'AED 280M estate used as venue', '3 off-market properties to be revealed', 'Rolls-Royce fleet + Nobu private dinner'], sourceUrl: 'https://www.sothebysrealty.com/dubai', sourceName: 'Sotheby\'s International Realty' },
  { id: 'if5', type: 'Developer Launch', timestamp: '2026-03-05T14:00:00Z', headline: 'Emaar announces "The Oasis" - ultra-luxury villa community', description: 'New development with plots starting AED 40M. VIP allocation opens March 15. Our Emaar contact Omar Hadid can secure early access.', relevantClientIds: ['c2', 'c5', 'c11'], urgency: 'High', tags: ['Emaar', 'New Development', 'Villa'], summary: 'Emaar Properties has officially announced "The Oasis" — a master-planned ultra-luxury villa community spanning 100 million sqft in Dubai\'s emerging southern corridor. Phase 1 includes 200 waterfront plots starting from AED 40M, with completed villas expected from AED 80M. The project features championship golf, a crystal lagoon, and branded residences by Elie Saab and Armani Casa. VIP allocation begins March 15 with a 72-hour priority window for select broker partners. This is Emaar\'s largest residential launch since Dubai Hills Estate, signaling strong confidence in the ultra-luxury segment\'s depth.', keyFacts: ['100M sqft master-planned community', 'Phase 1: 200 waterfront plots from AED 40M', 'Branded residences: Elie Saab & Armani Casa', 'VIP allocation: March 15 (72-hour priority)', 'Emaar\'s largest launch since Dubai Hills'], sourceUrl: 'https://www.emaar.com/the-oasis', sourceName: 'Emaar Properties' },
  { id: 'if6', type: 'Regulatory Update', timestamp: '2026-03-05T11:30:00Z', headline: 'Golden Visa threshold lowered to AED 1M property value', description: 'UAE government expands Golden Visa eligibility. Significant boost expected for AED 1-5M segment. Potential catalyst for affluent tier clients.', relevantClientIds: ['c19', 'c22', 'c24'], urgency: 'Medium', tags: ['Golden Visa', 'Regulation', 'Government'], summary: 'The UAE Cabinet has approved a reduction of the Golden Visa property investment threshold from AED 2M to AED 1M, effective immediately. This landmark policy change is expected to dramatically expand the pool of eligible foreign buyers, particularly in the AED 1-5M segment which represents 62% of all Dubai residential transactions. Industry analysts project a 15-25% increase in foreign buyer activity within 90 days. The visa grants 10-year renewable residency with full family sponsorship, making it one of the most attractive residency-by-investment programs globally.', keyFacts: ['Threshold lowered: AED 2M → AED 1M', '10-year renewable residency + family sponsorship', 'AED 1-5M segment = 62% of all transactions', 'Expected 15-25% increase in foreign buyer activity', 'Effective immediately — no phase-in period'], sourceUrl: 'https://u.ae/en/information-and-services/visa-and-emirates-id/golden-visa', sourceName: 'UAE Government Portal' },
  { id: 'if7', type: 'New Listing', timestamp: '2026-03-05T09:00:00Z', headline: 'Jumeirah Bay Island mansion - AED 210M off-market', description: 'Exclusive off-market opportunity. 12,000 sqft on the island. Only 3 brokers have access. Perfect for trophy buyer profiles.', relevantClientIds: ['c1', 'c16'], urgency: 'High', tags: ['Jumeirah Bay', 'Off-Market', 'Mansion'], summary: 'An exceptional off-market opportunity has surfaced on Jumeirah Bay Island — one of Dubai\'s most exclusive addresses with only 56 residential plots. This 12,000 sqft mansion sits on a 25,000 sqft beachfront plot with 40 meters of direct sea frontage and panoramic views of the Dubai skyline. The property was completed in 2023 by a renowned Italian architect, features imported Calacatta marble throughout, and includes a private dock. The seller is a GCC royal family member seeking a discrete transaction. Only 3 brokerages have been granted access, creating a rare first-mover opportunity.', keyFacts: ['12,000 sqft mansion on 25,000 sqft plot', '40m direct sea frontage on Jumeirah Bay Island', 'Only 56 residential plots on the island', 'Private dock, Italian architect, Calacatta marble', 'Discreet sale — only 3 brokers have access'], sourceUrl: 'https://www.luxuryproperty.com/dubai/jumeirah-bay-island', sourceName: 'Off-Market Intelligence' },
  { id: 'if8', type: 'Price Change', timestamp: '2026-03-04T17:20:00Z', headline: 'Downtown Sky Collection unit relisted at AED 48M (+7%)', description: 'Seller increased asking price after receiving multiple offers. Market confidence signal for Downtown segment.', relevantClientIds: ['c11', 'c4'], urgency: 'Medium', tags: ['Downtown Dubai', 'Price Increase', 'Penthouse'], metadata: { areaName: 'Downtown Dubai', propertyId: 'p4', priceOld: 45_000_000, priceNew: 48_000_000 }, summary: 'In a strong market confidence signal, the half-floor unit at the Sky Collection in Downtown Dubai has been relisted at AED 48M — a 7% increase from the previous AED 45M asking price. The seller received 4 competitive offers within the first 14 days of listing, prompting the price adjustment. This is notable because price increases on active listings are rare, occurring in fewer than 5% of luxury transactions. The unit offers unobstructed Burj Khalifa views, 6,200 sqft of living space, and private elevator access. The move suggests the Downtown luxury segment is entering a seller\'s market phase.', keyFacts: ['Relisted at AED 48M — up from AED 45M (+7%)', '4 competitive offers received in 14 days', 'Price increases occur in <5% of luxury listings', '6,200 sqft half-floor, private elevator', 'Unobstructed Burj Khalifa views'], sourceUrl: 'https://www.propertyfinder.ae/en/buy/dubai/downtown-dubai', sourceName: 'Property Finder' },
  { id: 'if9', type: 'Market Signal', timestamp: '2026-03-04T14:00:00Z', headline: 'Chinese buyer inquiries surge 40% in February', description: 'Shanghai and Beijing-based HNW inquiries for Dubai luxury properties at all-time high. Currency dynamics and domestic market uncertainty driving interest.', relevantClientIds: ['c2'], urgency: 'Medium', tags: ['China', 'Buyer Trend', 'International'], summary: 'Chinese buyer inquiries for Dubai luxury properties surged 40% in February 2026 compared to January, reaching all-time highs according to data from major portals. The trend is driven by three converging factors: continued weakness in the Chinese domestic property market (tier-1 city prices down 8% YoY), favorable CNY/AED exchange dynamics, and Beijing\'s relaxation of outbound capital controls for property investments under USD 5M. Shanghai and Beijing-based buyers are primarily targeting the AED 5-20M range in Dubai Marina, Downtown Dubai, and Palm Jumeirah. Industry sources note a shift from speculative to end-user purchases, with 65% of inquiries including residency visa requirements.', keyFacts: ['40% MoM increase in Chinese buyer inquiries', 'Chinese tier-1 property prices down 8% YoY', 'Target range: AED 5-20M (Marina, Downtown, Palm)', '65% inquiries include residency visa interest', 'Capital control relaxation for sub-USD 5M purchases'], sourceUrl: 'https://www.arabianbusiness.com/property', sourceName: 'Arabian Business' },
  { id: 'if10', type: 'Competitive Intel', timestamp: '2026-03-04T10:30:00Z', headline: 'Betterhomes poaches two senior luxury agents', description: 'Competitor aggressively recruiting. Two agents with combined AED 500M in active pipelines moved this week.', relevantClientIds: [], urgency: 'Low', tags: ['Competitor', 'Market Intel', 'HR'], summary: 'Betterhomes has recruited two senior luxury division agents this week, each bringing substantial active pipelines. The combined AED 500M in active deals represents approximately 12 transactions in various stages. This follows Betterhomes\' announcement of a new luxury division in January and signals aggressive expansion into the premium segment. The departing agents had average deal sizes of AED 40M+ and established relationships with European and GCC UHNW clients. Industry contacts suggest Betterhomes is offering 70/30 commission splits and AED 50K monthly retainers to attract top talent.', keyFacts: ['2 senior agents recruited with AED 500M pipeline', 'Approx. 12 active transactions transferring', 'Average deal size: AED 40M+', 'Betterhomes offering 70/30 splits + AED 50K retainer', 'New luxury division launched January 2026'], sourceUrl: 'https://www.zawya.com/en/business/real-estate', sourceName: 'Zawya' },
  { id: 'if11', type: 'Developer Launch', timestamp: '2026-03-04T08:00:00Z', headline: 'DAMAC launches Cavalli-branded tower in Marina', description: 'Ultra-luxury branded residences starting AED 8M. Fashion brand tie-in targeting lifestyle buyers. Completion Q4 2028.', relevantClientIds: ['c6', 'c10', 'c13'], urgency: 'Medium', tags: ['DAMAC', 'Branded', 'Dubai Marina'], summary: 'DAMAC Properties has launched Cavalli Tower in Dubai Marina — a 60-storey branded residential tower in partnership with Roberto Cavalli. Units range from 1-bedroom apartments at AED 8M to full-floor penthouses at AED 65M. The tower features interiors designed by the Cavalli Casa studio, with signature animal print accents and gold-leaf finishes. Amenities include a branded spa, infinity pool with Marina views, and private members\' club. DAMAC is offering a 60/40 payment plan (60% during construction, 40% on handover). Completion is scheduled for Q4 2028. Early-stage branded residences in Dubai have historically appreciated 15-25% from launch to completion.', keyFacts: ['60-storey tower — 1BR from AED 8M to PH AED 65M', 'Roberto Cavalli Casa designed interiors', '60/40 payment plan — 60% during construction', 'Completion: Q4 2028', 'Branded residences: 15-25% historic appreciation'], sourceUrl: 'https://www.damacproperties.com', sourceName: 'DAMAC Properties' },
  { id: 'if12', type: 'New Listing', timestamp: '2026-03-03T16:00:00Z', headline: 'Al Barari mega-villa with tropical gardens - AED 55M', description: '15,000 sqft living space surrounded by botanical gardens. Unique proposition for nature-focused buyers.', relevantClientIds: ['c3'], urgency: 'Low', tags: ['Al Barari', 'Villa', 'Nature'], summary: 'A significant new listing in Al Barari — Dubai\'s green sanctuary community. This mega-villa offers 15,000 sqft of living space across two levels, set within 1.5 acres of private tropical gardens featuring over 300 species of plants. The property includes a 25-meter lap pool, outdoor entertainment pavilion, and dedicated greenhouse. Al Barari homes rarely come to market (average 4 per year), making this a notable opportunity. The asking price of AED 55M represents AED 3,667/sqft — a premium to the Al Barari average of AED 1,650/sqft, justified by the exceptionally large plot and mature landscaping.', keyFacts: ['15,000 sqft living on 1.5-acre plot', '300+ plant species in private gardens', 'AED 3,667/sqft — premium to area avg of AED 1,650', 'Only ~4 Al Barari homes list per year', '25m lap pool, greenhouse, entertainment pavilion'], sourceUrl: 'https://www.propertyfinder.ae/en/buy/dubai/al-barari', sourceName: 'Property Finder' },
  { id: 'if13', type: 'Market Signal', timestamp: '2026-03-03T12:00:00Z', headline: 'Mortgage rates hold steady at 4.25% for Q2', description: 'UAE Central Bank maintains accommodative stance. Favorable financing environment continues for leveraged buyers.', relevantClientIds: [], urgency: 'Low', tags: ['Mortgage', 'Interest Rate', 'Finance'], summary: 'The UAE Central Bank has maintained its benchmark interest rate at 4.25% for Q2 2026, continuing the accommodative monetary policy that has supported property market growth. With UAE rates pegged to the US Federal Reserve, the decision follows the Fed\'s hold at its March meeting. Variable mortgage rates for prime borrowers currently range from 4.49-5.25% across major UAE banks, while fixed 5-year rates are available at 4.99-5.50%. The stable rate environment is particularly favorable for leveraged luxury buyers, where even small rate changes impact monthly payments significantly on high-value mortgages.', keyFacts: ['UAE benchmark rate: 4.25% — unchanged for Q2', 'Variable rates: 4.49-5.25% for prime borrowers', '5-year fixed: 4.99-5.50% across major banks', 'Rate pegged to US Fed — next review June 2026', 'Stable rates support leveraged luxury purchases'], sourceUrl: 'https://www.centralbank.ae', sourceName: 'UAE Central Bank' },
  { id: 'if14', type: 'Regulatory Update', timestamp: '2026-03-03T09:00:00Z', headline: 'RERA introduces enhanced escrow transparency rules', description: 'New regulations require developers to provide quarterly escrow account statements. Increased buyer protection for off-plan purchases.', relevantClientIds: [], urgency: 'Low', tags: ['RERA', 'Regulation', 'Off-Plan'], summary: 'The Real Estate Regulatory Agency (RERA) has introduced enhanced escrow account transparency requirements for all Dubai developers effective April 1, 2026. Under the new rules, developers must provide quarterly escrow account statements to all off-plan purchasers, submit monthly escrow reports to RERA, and maintain a minimum escrow balance equal to 20% of projected construction costs at all times. The regulation follows the Dubai government\'s broader push for market maturity and investor protection. This is expected to increase buyer confidence in off-plan purchases, particularly among international investors who have historically cited escrow concerns as a barrier to entry.', keyFacts: ['Quarterly escrow statements mandatory for buyers', 'Monthly escrow reports to RERA required', 'Minimum 20% of construction costs in escrow', 'Effective April 1, 2026', 'Expected to boost off-plan buyer confidence'], sourceUrl: 'https://www.rera.gov.ae', sourceName: 'RERA — Dubai Government' },
  { id: 'if15', type: 'Price Change', timestamp: '2026-03-02T15:30:00Z', headline: 'Emirates Hills estate withdrawn after AED 250M offer rejected', description: 'Seller holding firm above AED 250M for largest Emirates Hills plot. Signals continued confidence in ultra-prime segment.', relevantClientIds: ['c1', 'c7'], urgency: 'Medium', tags: ['Emirates Hills', 'Ultra-Luxury', 'Price'], summary: 'The largest residential plot in Emirates Hills (Sector E, Plot 7 — 42,000 sqft) has been withdrawn from the market after the seller rejected an offer of AED 250M. Sources indicate the seller is targeting AED 280-300M, believing the ultra-prime segment has further upside. The property includes a 18,000 sqft mansion designed by Foster + Partners, 6-car garage, private tennis court, and direct golf course frontage. This is a significant market signal — the rejection of a quarter-billion dirham offer suggests sellers in the ultra-prime segment are holding for higher prices, consistent with the 8.1% price appreciation seen in Jumeirah Bay and Palm tip properties this quarter.', keyFacts: ['AED 250M offer rejected — seller targets AED 280-300M', 'Largest Emirates Hills plot: 42,000 sqft', '18,000 sqft mansion by Foster + Partners', 'Direct golf course frontage, private tennis court', 'Ultra-prime segment: +8.1% appreciation this quarter'], sourceUrl: 'https://www.luxhabitat.ae/emirates-hills', sourceName: 'Market Intelligence' },
  { id: 'if16', type: 'Competitive Intel', timestamp: '2026-03-02T11:00:00Z', headline: 'Christie\'s Real Estate opens Dubai office in DIFC', description: 'Major international player entering Dubai luxury market. Will compete for UHNW trophy buyer segment.', relevantClientIds: [], urgency: 'Medium', tags: ['Competitor', 'DIFC', 'International'], summary: 'Christie\'s International Real Estate has officially opened its Dubai office in Gate Village, DIFC — marking the auction house\'s first direct presence in the Middle East real estate market. The office will be led by former Knight Frank partner James Henderson, who brings 15 years of Dubai luxury experience and an established AED 1.2B client network. Christie\'s is positioning to leverage its global brand and auction house client base of 8 million registered bidders to attract UHNW trophy buyers to Dubai. The launch coincides with Christie\'s reporting a 15% increase in global luxury real estate transactions in 2025.', keyFacts: ['First Christie\'s RE office in Middle East', 'Located in Gate Village, DIFC', 'Led by ex-Knight Frank partner (AED 1.2B network)', '8 million registered Christie\'s bidders globally', 'Christie\'s luxury RE transactions up 15% in 2025'], sourceUrl: 'https://www.christiesrealestate.com', sourceName: 'Christie\'s International Real Estate' },
  { id: 'if17', type: 'New Listing', timestamp: '2026-03-02T08:00:00Z', headline: 'Creek Harbour signature penthouse - AED 35M', description: 'Top-floor unit in new tower with unobstructed creek views. Smart home features throughout. Ideal for tech-forward buyers.', relevantClientIds: ['c9', 'c12'], urgency: 'Low', tags: ['Dubai Creek', 'Penthouse', 'Smart Home'], summary: 'A signature penthouse in the newly completed Creek Tower has listed at AED 35M. The 5,800 sqft unit occupies the top floor with 360-degree views of Dubai Creek and the Ras Al Khor wildlife sanctuary. The property features a fully integrated Crestron smart home system, floor-to-ceiling electrochromic glass, home cinema, and private terrace with plunge pool. At AED 6,034/sqft, it carries a premium to the Creek Harbour average (AED 1,800/sqft) but is positioned as the signature unit in the development. The tech-forward specification targets a growing cohort of tech-industry buyers relocating to Dubai.', keyFacts: ['5,800 sqft top-floor penthouse — 360° views', 'AED 6,034/sqft — signature unit premium', 'Crestron smart home, electrochromic glass', 'Home cinema, private terrace with plunge pool', 'Creek Tower — newly completed'], sourceUrl: 'https://www.bayut.com/for-sale/property/dubai/dubai-creek-harbour', sourceName: 'Bayut' },
  { id: 'if18', type: 'Developer Launch', timestamp: '2026-03-01T14:00:00Z', headline: 'Nakheel launches next phase of Palm Jebel Ali', description: 'Second palm island residential plots now available. Starting AED 15M for waterfront plots. Long-term investment play.', relevantClientIds: ['c2', 'c5', 'c8'], urgency: 'Medium', tags: ['Nakheel', 'Palm Jebel Ali', 'Development'], summary: 'Nakheel has launched Phase 2 of Palm Jebel Ali — Dubai\'s second palm-shaped island — with 450 residential waterfront plots starting from AED 15M. The phase includes beachfront villas, canal plots, and a limited collection of 25 "Signature Frond" plots from AED 45M. Infrastructure development is 40% complete with a targeted 2029 first handover. Nakheel is offering a 70/30 payment plan with no DLD fee on launch purchases. Palm Jumeirah early investors saw 300-500% appreciation from launch to maturity, making Palm Jebel Ali one of the most anticipated long-term investment plays in Dubai. However, the 3+ year construction timeline carries execution risk.', keyFacts: ['450 waterfront plots from AED 15M', '25 "Signature Frond" plots from AED 45M', '70/30 payment plan — no DLD fee at launch', 'Infrastructure 40% complete — handover 2029', 'Palm Jumeirah early investors: 300-500% returns'], sourceUrl: 'https://www.nakheel.com/palm-jebel-ali', sourceName: 'Nakheel' },
  { id: 'if19', type: 'Market Signal', timestamp: '2026-03-01T10:00:00Z', headline: 'Dubai tourism hits record 20M visitors in 2025', description: 'Tourism boom driving short-term rental yields up 15%. Investment properties in Marina and Downtown seeing premium valuations.', relevantClientIds: ['c2', 'c8', 'c14'], urgency: 'Medium', tags: ['Tourism', 'Rental Yield', 'Investment'], summary: 'Dubai welcomed a record 20 million international visitors in 2025, surpassing its previous record by 12%. The tourism surge has directly impacted the residential property market, with short-term rental yields rising 15% year-over-year. Dubai Marina and Downtown Dubai are the primary beneficiaries, where furnished apartments are achieving gross yields of 8-10% through holiday rental platforms. Hotel-apartment conversions and serviced residence developments are seeing particular demand. The tourism authority projects 22 million visitors in 2026, supported by 40+ new hotel openings and expanded airline capacity.', keyFacts: ['20M visitors in 2025 — record (+12% YoY)', 'Short-term rental yields up 15%', 'Marina/Downtown furnished: 8-10% gross yields', '2026 projection: 22M visitors', '40+ new hotels opening in 2026'], sourceUrl: 'https://www.dubaitourism.gov.ae', sourceName: 'Dubai Tourism' },
  { id: 'if20', type: 'Price Change', timestamp: '2026-02-28T16:00:00Z', headline: 'Bluewaters penthouse price increased 12% after renovation', description: 'Complete interior redesign by Kelly Hoppen. New asking price AED 88M reflects premium finishes and brand association.', relevantClientIds: ['c6'], urgency: 'Low', tags: ['Bluewaters Island', 'Renovation', 'Penthouse'], metadata: { areaName: 'Bluewaters Island', priceOld: 78_000_000, priceNew: 88_000_000 }, summary: 'A Bluewaters Island penthouse has been relisted at AED 88M following a complete interior redesign by celebrity designer Kelly Hoppen CBE. The renovation added approximately AED 10M in value, transforming the 8,200 sqft unit with bespoke furniture, custom lighting, and a curated art collection. The new AED 10,732/sqft price point establishes a new benchmark for Bluewaters. The seller is positioning the property as a "move-in ready" luxury turnkey proposition targeting international buyers who value design provenance. Kelly Hoppen-designed properties globally have demonstrated a 15-20% premium over comparable unbranded finishes.', keyFacts: ['Price increased: AED 78M → AED 88M (+12%)', 'Kelly Hoppen CBE complete interior redesign', 'AED 10M renovation value added', 'AED 10,732/sqft — new Bluewaters benchmark', 'Designer properties: 15-20% premium globally'], sourceUrl: 'https://www.propertyfinder.ae/en/buy/dubai/bluewaters-island', sourceName: 'Property Finder' },
  { id: 'if21', type: 'Competitive Intel', timestamp: '2026-02-28T12:00:00Z', headline: 'Hamptons International reporting AED 2B in Q1 pipeline', description: 'Strong pipeline report from competitor. Market absorbing inventory well. Confirms positive sentiment across luxury segment.', relevantClientIds: [], urgency: 'Low', tags: ['Competitor', 'Pipeline', 'Market'], summary: 'Hamptons International Dubai has disclosed an AED 2 billion Q1 2026 pipeline in their latest investor update — a 35% increase over Q1 2025. The pipeline comprises approximately 45 transactions with an average deal size of AED 44M. Key areas of concentration include Emirates Hills (28%), Palm Jumeirah (24%), and Downtown Dubai (18%). The strong pipeline report is a positive market signal, confirming that the luxury segment is absorbing inventory at healthy rates. Hamptons\' performance also correlates with broader market data showing sustained demand in the AED 20-100M bracket.', keyFacts: ['AED 2B Q1 pipeline — up 35% YoY', '~45 transactions, AED 44M average deal', 'Emirates Hills 28%, Palm 24%, Downtown 18%', 'Confirms luxury segment absorbing inventory well', 'AED 20-100M bracket showing sustained demand'], sourceUrl: 'https://www.hamptons.co.uk/dubai', sourceName: 'Hamptons International' },
  { id: 'if22', type: 'New Listing', timestamp: '2026-02-27T09:00:00Z', headline: 'DIFC penthouse with private rooftop pool - AED 38M', description: 'Full-floor penthouse in Gate Village. Walk to work proposition for finance professionals. Premium corporate lifestyle.', relevantClientIds: ['c4', 'c8'], urgency: 'Low', tags: ['DIFC', 'Penthouse', 'Corporate'], summary: 'A full-floor penthouse in DIFC\'s Gate Village Residences has listed at AED 38M. The 4,800 sqft unit features a private rooftop terrace with infinity pool, offering panoramic views of the DIFC skyline and Emirates Towers. The property is positioned as a "walk to work" luxury proposition for C-suite finance professionals based in DIFC. At AED 7,917/sqft, it carries a significant premium to DIFC averages (AED 2,400/sqft) but represents a unique lifestyle value proposition. DIFC penthouse inventory is extremely limited with only 3 units available across all buildings, creating scarcity-driven pricing.', keyFacts: ['4,800 sqft full-floor in Gate Village', 'Private rooftop infinity pool + terrace', 'AED 7,917/sqft — DIFC penthouse premium', 'Only 3 DIFC penthouses currently available', 'Walk-to-work for C-suite finance professionals'], sourceUrl: 'https://www.bayut.com/for-sale/property/dubai/difc', sourceName: 'Bayut' },
  { id: 'if23', type: 'Regulatory Update', timestamp: '2026-02-26T11:00:00Z', headline: 'Dubai introduces 3-year property tax freeze for new buyers', description: 'Government incentive for new property purchases. Effective immediately. Significant cost savings for high-value transactions.', relevantClientIds: [], urgency: 'High', tags: ['Tax', 'Government', 'Incentive'], summary: 'The Dubai government has announced a 3-year property tax freeze for new property purchases, effective immediately. Under the new scheme, buyers of residential properties will not face any increase in service charges, community fees, or municipal taxes for 36 months from the date of purchase. For a typical AED 50M property, this translates to estimated savings of AED 500,000-750,000 over the freeze period. The incentive applies to both ready and off-plan properties and is available to UAE nationals and foreign investors alike. This is the most significant buyer incentive introduced since the 2020 stimulus package and signals the government\'s commitment to maintaining Dubai\'s competitive position for international investment.', keyFacts: ['3-year freeze on service charges and municipal taxes', 'Applies to ready and off-plan properties', 'AED 500-750K savings on a typical AED 50M property', 'Available to nationals and foreign investors', 'Effective immediately — most significant since 2020'], sourceUrl: 'https://www.dm.gov.ae', sourceName: 'Dubai Municipality' },
  { id: 'if24', type: 'Market Signal', timestamp: '2026-02-25T14:00:00Z', headline: 'Russian buyer segment rebounds after 18-month decline', description: 'Post-sanctions adaptation complete. Russian HNW clients returning to Dubai market through UAE-based entities.', relevantClientIds: ['c3', 'c18', 'c23'], urgency: 'Medium', tags: ['Russia', 'Buyer Trend', 'International'], summary: 'Russian buyer activity in Dubai\'s luxury property market has rebounded to pre-2024 levels after an 18-month decline that followed tightened international sanctions. The recovery is driven by Russian HNW individuals establishing UAE-based corporate entities and utilizing bilateral banking channels. February 2026 data shows Russian nationals accounting for 13% of all luxury transactions above AED 10M — back to the 2023 peak. Key areas of focus include Palm Jumeirah, Emirates Hills, and Dubai Marina. The average Russian buyer transaction size has increased from AED 15M to AED 28M, indicating a shift toward ultra-prime purchases by wealthier cohorts.', keyFacts: ['Russian luxury share: 13% — back to 2023 peak', 'Average transaction: AED 28M (up from AED 15M)', 'UAE-based entities enabling transactions', 'Focus: Palm Jumeirah, Emirates Hills, Marina', '18-month sanctions impact now fully absorbed'], sourceUrl: 'https://www.arabianbusiness.com/property', sourceName: 'Arabian Business' },
  { id: 'if25', type: 'Developer Launch', timestamp: '2026-02-24T10:00:00Z', headline: 'Omniyat launches ultra-luxury tower on Palm trunk', description: 'Dorchester Collection branded residences. Starting AED 25M for 2-bed. Expected to sell out at VIP launch.', relevantClientIds: ['c5', 'c11'], urgency: 'Medium', tags: ['Omniyat', 'Palm Jumeirah', 'Branded'] },
  { id: 'if26', type: 'Price Change', timestamp: '2026-02-23T08:00:00Z', headline: 'Palm Jumeirah avg price/sqft crosses AED 3,800 milestone', description: 'Area-wide milestone. 15% YoY appreciation. Fastest growing luxury sub-market in the GCC region.', relevantClientIds: ['c1', 'c7', 'c16'], urgency: 'Medium', tags: ['Palm Jumeirah', 'Milestone', 'Appreciation'] },
  { id: 'if27', type: 'New Listing', timestamp: '2026-02-22T14:00:00Z', headline: 'Downtown Dubai full-floor apartment - AED 62M', description: 'Rare full-floor unit in Address tower. 360-degree views including Burj Khalifa and sea. Premium corporate-lifestyle crossover.', relevantClientIds: ['c11', 'c4'], urgency: 'Medium', tags: ['Downtown Dubai', 'Full Floor', 'Views'] },
  { id: 'if28', type: 'Market Signal', timestamp: '2026-02-20T10:00:00Z', headline: 'Indian UHNW allocations to Dubai property up 35%', description: 'Family offices from Mumbai and Delhi increasing Dubai allocations. Tax treaty benefits and lifestyle pull driving trend.', relevantClientIds: ['c12'], urgency: 'Medium', tags: ['India', 'UHNW', 'Allocation'] },
]

export const marketMetrics: MarketMetrics = {
  avgPricePerSqft: 2740,
  monthlyTransactionVolume: 299,
  daysOnMarketAvg: 48,
  totalInventory: 1065,
  marketSentimentScore: 82,
  priceHistory7d: [2680, 2695, 2710, 2705, 2725, 2738, 2740],
}

export const PROPERTY_COORDS: Record<string, [number, number]> = {
  p1: [55.1380, 25.1120],   // Palm Jumeirah
  p2: [55.1400, 25.0780],   // Dubai Marina
  p3: [55.1750, 25.0650],   // Emirates Hills
  p4: [55.2750, 25.1970],   // Downtown Dubai
  p5: [55.1200, 25.0820],   // Bluewaters Island
  p6: [55.1420, 25.1180],   // Palm Jumeirah (Royal)
  p7: [55.3420, 25.2050],   // Dubai Creek
  p8: [55.2600, 25.0450],   // Al Barari
  p9: [55.2820, 25.2120],   // DIFC
  p10: [55.2350, 25.1880],  // Jumeirah Bay
}

export const AREA_COORDS: Record<string, { center: [number, number]; label: string }> = {
  'Palm Jumeirah': { center: [55.1380, 25.1120], label: 'Palm Jumeirah' },
  'Emirates Hills': { center: [55.1750, 25.0650], label: 'Emirates Hills' },
  'Dubai Marina': { center: [55.1400, 25.0780], label: 'Dubai Marina' },
  'Downtown Dubai': { center: [55.2750, 25.1970], label: 'Downtown Dubai' },
  'Jumeirah Bay': { center: [55.2350, 25.1880], label: 'Jumeirah Bay' },
  'Bluewaters Island': { center: [55.1200, 25.0820], label: 'Bluewaters Island' },
  'Dubai Creek': { center: [55.3420, 25.2050], label: 'Dubai Creek' },
  'DIFC': { center: [55.2820, 25.2120], label: 'DIFC' },
  'Al Barari': { center: [55.2600, 25.0450], label: 'Al Barari' },
}

export const intelTypeColors: Record<IntelFeedType, string> = {
  'New Listing': '#22c55e',
  'Price Change': '#d4a574',
  'Market Signal': '#3b82f6',
  'Competitive Intel': '#f59e0b',
  'Regulatory Update': '#a78bfa',
  'Developer Launch': '#ec4899',
}

export function getIntelByType(type: IntelFeedType): IntelFeedItem[] { return intelFeed.filter(i => i.type === type) }
export function getIntelByUrgency(urgency: 'High' | 'Medium' | 'Low'): IntelFeedItem[] { return intelFeed.filter(i => i.urgency === urgency) }
export function getAreaMetric(areaName: string): AreaMetric | undefined { return areaMetrics.find(a => a.areaName === areaName) }
export function getClientName(clientId: string): string { return clients.find(c => c.id === clientId)?.name ?? clientId }

// ============================================================
// ENHANCED PROPERTY DETAILS - Ultra-Realistic Profiles
// ============================================================

export interface PropertyImage {
  url: string
  caption: string
  category: 'exterior' | 'interior' | 'living' | 'bedroom' | 'kitchen' | 'pool' | 'view' | 'bathroom' | 'garden'
}

export interface PropertyDetail {
  propertyId: string
  tagline: string
  description: string
  highlights: string[]
  images: PropertyImage[]
  specs: {
    totalArea: number       // sqft
    plotSize?: number       // sqft
    builtYear: number
    floors: number
    bathrooms: number
    parking: number
    serviceCharge?: number  // AED per sqft/year
  }
  amenities: string[]
  neighborhood: {
    walkScore: number
    nearbyLandmarks: string[]
    schoolDistrict: string
    commuteToDowntown: string
  }
  investment: {
    pricePerSqft: number
    estimatedRentalYield: number  // percentage
    capitalAppreciation5yr: number  // percentage
    comparableRecentSale: string
    dldFee: number  // AED
  }
  developer: string
  architect?: string
  completionStatus: 'Ready' | 'Under Construction' | 'Off Plan'
  furnishing: 'Furnished' | 'Semi-Furnished' | 'Unfurnished'
  viewType: string
  lastUpdated: string
  priceHistory?: { date: string; price: number; event?: string }[]
}

// Unsplash image URLs using known photo IDs
const IMG = (id: string, w = 800) => `https://images.unsplash.com/${id}?w=${w}&q=80&fit=crop&auto=format`

export const propertyDetails: Record<string, PropertyDetail> = {
  p1: {
    propertyId: 'p1',
    tagline: 'An Architectural Masterpiece on the Crescent',
    description: 'Commanding an unrivalled position on the outer crescent of Palm Jumeirah, this signature beachfront villa represents the pinnacle of Dubai luxury living. Designed by a Pritzker Prize-shortlisted architect, the residence spans 18,500 square feet across three levels, with floor-to-ceiling glazing that frames uninterrupted views of the Arabian Gulf. The double-height entrance atrium features a floating marble staircase beneath a custom Lasvit crystal chandelier. Every material has been sourced to exacting standards - Italian Calacatta marble floors, German engineered oak panelling, and hand-applied Venetian plaster walls. The private 65-meter beachfront is complemented by a temperature-controlled infinity pool with integrated Jacuzzi, outdoor cinema, and a fully equipped summer kitchen.',
    highlights: [
      'Private 65m beach frontage with direct sea access',
      'Temperature-controlled infinity pool with underwater speakers',
      'Dedicated smart home automation by Crestron',
      'Separate staff quarters with independent entrance',
      'Italian Calacatta marble throughout with radiant underfloor heating',
      'Three-car underground garage with EV charging stations',
    ],
    images: [
      { url: IMG('photo-1613490493576-7fde63acd811', 1200), caption: 'Grand exterior with private beachfront', category: 'exterior' },
      { url: IMG('photo-1600596542815-ffad4c1539a9', 1200), caption: 'Open-plan living with floor-to-ceiling gulf views', category: 'living' },
      { url: IMG('photo-1600607687939-ce8a6c25118c', 1200), caption: 'Master suite with panoramic sea view', category: 'bedroom' },
      { url: IMG('photo-1600566753190-17f0baa2a6c3', 1200), caption: 'Infinity pool overlooking the Arabian Gulf', category: 'pool' },
      { url: IMG('photo-1600585154340-be6161a56a0c', 1200), caption: 'Chef-grade kitchen with Gaggenau appliances', category: 'kitchen' },
    ],
    specs: { totalArea: 18500, plotSize: 32000, builtYear: 2022, floors: 3, bathrooms: 9, parking: 3, serviceCharge: 18 },
    amenities: ['Private Beach', 'Infinity Pool', 'Home Cinema', 'Wine Cellar', 'Gym', 'Sauna', 'Smart Home', 'Summer Kitchen', 'Maid Rooms', 'Driver Room', 'CCTV', 'Landscaped Garden'],
    neighborhood: { walkScore: 42, nearbyLandmarks: ['Atlantis The Royal (3 min)', 'Nakheel Mall (5 min)', 'One&Only The Palm (2 min)'], schoolDistrict: 'GEMS Wellington International', commuteToDowntown: '18 min via Palm Tunnel' },
    investment: { pricePerSqft: 10000, estimatedRentalYield: 3.2, capitalAppreciation5yr: 42, comparableRecentSale: 'Signature Villa G44 - AED 195M (Jan 2026)', dldFee: 7400000 },
    developer: 'Nakheel',
    architect: 'Foster + Partners',
    completionStatus: 'Ready',
    furnishing: 'Semi-Furnished',
    viewType: 'Full Sea + Atlantis View',
    lastUpdated: '2026-03-04T10:30:00Z',
  },
  p2: {
    propertyId: 'p2',
    tagline: 'Full-Floor Sky Residence with 360-Degree Marina Views',
    description: 'Occupying the entire 58th floor of one of Dubai Marina\'s most prestigious towers, this penthouse offers an unmatched combination of scale, views, and finish. At 6,800 square feet, the residence wraps around the building\'s core, delivering panoramic views spanning the marina, JBR beachfront, Palm Jumeirah, and the open sea beyond. The interior was completed by a leading Italian design house, with bespoke joinery in American walnut, Poliform kitchen systems, and Minotti furnishing throughout. A private high-speed elevator opens directly into a gallery-like entrance hall.',
    highlights: [
      'Full-floor layout with 360-degree panoramic views',
      'Private high-speed elevator direct to residence',
      'Marina, Palm Jumeirah, and Arabian Sea views',
      'Bespoke Italian interiors by Minotti and Poliform',
      'Smart glass balconies with retractable wind barriers',
    ],
    images: [
      { url: IMG('photo-1600047509807-ba8f99d2cdde', 1200), caption: 'Tower exterior at Dubai Marina', category: 'exterior' },
      { url: IMG('photo-1600210492493-0946911123ea', 1200), caption: 'Panoramic living space with marina views', category: 'living' },
      { url: IMG('photo-1600585154526-990dced4db0d', 1200), caption: 'Master bedroom with floor-to-ceiling glazing', category: 'bedroom' },
      { url: IMG('photo-1600566753086-00f18fb6b3ea', 1200), caption: 'Skyline view from the wraparound terrace', category: 'view' },
      { url: IMG('photo-1600573472592-401b489a3cdc', 1200), caption: 'Contemporary bathroom with marble finishes', category: 'bathroom' },
    ],
    specs: { totalArea: 6800, builtYear: 2021, floors: 1, bathrooms: 5, parking: 3, serviceCharge: 45 },
    amenities: ['Private Elevator', 'Wraparound Terrace', 'Smart Glass', 'Concierge', 'Valet Parking', 'Residents Lounge', 'Rooftop Pool', 'Gym', 'Spa'],
    neighborhood: { walkScore: 89, nearbyLandmarks: ['Dubai Marina Mall (1 min)', 'JBR Beach (3 min walk)', 'Bluewaters Island (5 min)'], schoolDistrict: 'Dubai International Academy', commuteToDowntown: '12 min via Sheikh Zayed Road' },
    investment: { pricePerSqft: 7647, estimatedRentalYield: 4.1, capitalAppreciation5yr: 35, comparableRecentSale: 'Penthouse 59A, Cayan Tower - AED 48M (Dec 2025)', dldFee: 2080000 },
    developer: 'Emaar Properties',
    completionStatus: 'Ready',
    furnishing: 'Furnished',
    viewType: 'Full Marina + Sea + Palm View',
    lastUpdated: '2026-03-03T14:00:00Z',
  },
  p3: {
    propertyId: 'p3',
    tagline: 'A Dynasty-Scale Estate on the Fairway',
    description: 'Positioned on a premium plot overlooking the 7th fairway of the Montgomerie Golf Course, this palatial estate is among the largest private residences in Emirates Hills. The 28,000 square foot mansion was designed to accommodate multi-generational living with absolute privacy. The property features a grand entrance with a porte-cochere, a central courtyard with a reflecting pool, and formal reception rooms that can host diplomatic-level events. The master wing occupies its own floor with a private terrace, walk-in closets, and a marble spa bathroom. Separate guest wings, staff quarters for six, a commercial-grade kitchen, and a basement entertainment complex complete this extraordinary residence.',
    highlights: [
      'Premium plot on the 7th fairway of Montgomerie Golf Course',
      'Grand porte-cochere entrance with 12-car garage',
      'Central courtyard with reflecting pool and sculpture garden',
      'Separate staff quarters for six with independent services',
      'Championship tennis court with floodlighting',
      'Basement entertainment complex with bowling alley and cinema',
    ],
    images: [
      { url: IMG('photo-1600596542815-ffad4c1539a9', 1200), caption: 'Palatial entrance with manicured grounds', category: 'exterior' },
      { url: IMG('photo-1600607687644-c7171b42498f', 1200), caption: 'Formal reception room with double-height ceilings', category: 'living' },
      { url: IMG('photo-1600566753190-17f0baa2a6c3', 1200), caption: 'Resort-style pool with golf course backdrop', category: 'pool' },
      { url: IMG('photo-1600210491892-ed2e3abf5a08', 1200), caption: 'Master suite terrace overlooking the fairway', category: 'bedroom' },
      { url: IMG('photo-1600585154340-be6161a56a0c', 1200), caption: 'Professional-grade kitchen with butler pantry', category: 'kitchen' },
    ],
    specs: { totalArea: 28000, plotSize: 45000, builtYear: 2019, floors: 3, bathrooms: 14, parking: 12, serviceCharge: 12 },
    amenities: ['Golf Course Frontage', 'Tennis Court', 'Swimming Pool', 'Staff Quarters', 'Home Cinema', 'Bowling Alley', 'Wine Room', 'Cigar Lounge', 'Gym', 'Sauna', 'Steam Room', 'Prayer Room', 'Landscaped Gardens'],
    neighborhood: { walkScore: 28, nearbyLandmarks: ['Montgomerie Golf Club (adjacent)', 'Emirates Hills Park (3 min)', 'Dubai Marina (8 min)'], schoolDistrict: 'GEMS International School', commuteToDowntown: '15 min via Al Khail Road' },
    investment: { pricePerSqft: 7857, estimatedRentalYield: 2.5, capitalAppreciation5yr: 48, comparableRecentSale: 'Sector W Villa 14 - AED 210M (Feb 2026)', dldFee: 8800000 },
    developer: 'Custom Build - Aldar Projects',
    architect: 'Zaha Hadid Architects',
    completionStatus: 'Ready',
    furnishing: 'Semi-Furnished',
    viewType: 'Full Golf Course + Lake View',
    lastUpdated: '2026-03-01T09:15:00Z',
  },
  p4: {
    propertyId: 'p4',
    tagline: 'A Privileged Address in the Shadow of the World\'s Tallest',
    description: 'This meticulously curated penthouse sits in the most coveted tower in Downtown Dubai, offering an unobstructed vista of the Burj Khalifa from every living space. At 4,200 square feet, the open-plan layout has been designed by a celebrated Milanese interior studio, featuring polished terrazzo floors, custom bronze fixtures, and walls of floor-to-ceiling glass that dissolve the boundary between interior and the iconic skyline beyond. The Poggenpohl kitchen is fitted with Miele and Sub-Zero appliances. The building offers a 5-star concierge, an Olympic-length lap pool, and residents-only access to a private rooftop lounge.',
    highlights: [
      'Unobstructed Burj Khalifa views from every room',
      'Milanese-designed interiors with terrazzo and bronze accents',
      'Private rooftop access with dedicated lounge',
      '5-star hotel-style concierge and valet service',
      'Direct access to Dubai Mall via climate-controlled walkway',
    ],
    images: [
      { url: IMG('photo-1582407947304-fd86f028f716', 1200), caption: 'Burj Khalifa vista from the living terrace', category: 'view' },
      { url: IMG('photo-1600210492493-0946911123ea', 1200), caption: 'Contemporary living with skyline panorama', category: 'living' },
      { url: IMG('photo-1600585154526-990dced4db0d', 1200), caption: 'Master bedroom facing the fountain show', category: 'bedroom' },
      { url: IMG('photo-1600573472592-401b489a3cdc', 1200), caption: 'Spa-inspired bathroom with rain shower', category: 'bathroom' },
      { url: IMG('photo-1600047509807-ba8f99d2cdde', 1200), caption: 'Tower exterior in Downtown Dubai', category: 'exterior' },
    ],
    specs: { totalArea: 4200, builtYear: 2023, floors: 1, bathrooms: 4, parking: 2, serviceCharge: 65 },
    amenities: ['Concierge', 'Infinity Pool', 'Valet Parking', 'Rooftop Lounge', 'Connected to Dubai Mall', 'Gym', 'Spa', 'Residents Cinema', 'Business Centre'],
    neighborhood: { walkScore: 96, nearbyLandmarks: ['Burj Khalifa (adjacent)', 'Dubai Mall (2 min walk)', 'Dubai Opera (5 min walk)', 'DIFC (7 min)'], schoolDistrict: 'GEMS Wellington Primary', commuteToDowntown: 'You are Downtown' },
    investment: { pricePerSqft: 10714, estimatedRentalYield: 5.2, capitalAppreciation5yr: 38, comparableRecentSale: 'Act One Act Two PH - AED 42M (Jan 2026)', dldFee: 1800000 },
    developer: 'Emaar Properties',
    architect: 'SOM (Skidmore, Owings & Merrill)',
    completionStatus: 'Ready',
    furnishing: 'Furnished',
    viewType: 'Direct Burj Khalifa + Dubai Fountain',
    lastUpdated: '2026-03-05T08:00:00Z',
  },
  p5: {
    propertyId: 'p5',
    tagline: 'Resort-Style Island Living at Bluewaters',
    description: 'A rare opportunity to own a full-floor apartment on Bluewaters Island, the exclusive man-made island developed by Meraas. This 5-bedroom residence offers 7,200 square feet of seamless indoor-outdoor living, with a wraparound terrace providing views of Ain Dubai, JBR, and the open Arabian Gulf. The interiors reflect a coastal-contemporary aesthetic with bleached timber floors, natural stone surfaces, and hand-forged ironwork details. Residents enjoy private beach access, a world-class wellness centre, and proximity to Ain Dubai and a curated selection of restaurants.',
    highlights: [
      'Full-floor layout on exclusive Bluewaters Island',
      'Wraparound terrace with Ain Dubai and JBR views',
      'Private beach access for residents',
      'World-class wellness centre with hammam',
      'Walking distance to Ain Dubai and waterfront dining',
    ],
    images: [
      { url: IMG('photo-1613490493576-7fde63acd811', 1200), caption: 'Bluewaters Island waterfront', category: 'exterior' },
      { url: IMG('photo-1600607687939-ce8a6c25118c', 1200), caption: 'Coastal-contemporary living area', category: 'living' },
      { url: IMG('photo-1600566753190-17f0baa2a6c3', 1200), caption: 'Private beach and infinity pool', category: 'pool' },
      { url: IMG('photo-1600210491892-ed2e3abf5a08', 1200), caption: 'Serene master bedroom retreat', category: 'bedroom' },
      { url: IMG('photo-1582407947304-fd86f028f716', 1200), caption: 'Ain Dubai views from the terrace', category: 'view' },
    ],
    specs: { totalArea: 7200, builtYear: 2020, floors: 1, bathrooms: 6, parking: 3, serviceCharge: 35 },
    amenities: ['Private Beach', 'Resort Pool', 'Gym', 'Spa', 'Hammam', 'Concierge', 'Valet', 'Kids Play Area', 'Residents Lounge', 'BBQ Area'],
    neighborhood: { walkScore: 78, nearbyLandmarks: ['Ain Dubai (adjacent)', 'JBR Beach (5 min walk)', 'Ceasars Palace (3 min)'], schoolDistrict: 'Kings School Al Barsha', commuteToDowntown: '20 min via Sheikh Zayed Road' },
    investment: { pricePerSqft: 10833, estimatedRentalYield: 4.8, capitalAppreciation5yr: 32, comparableRecentSale: 'Bluewaters 5BR - AED 72M (Nov 2025)', dldFee: 3120000 },
    developer: 'Meraas',
    completionStatus: 'Ready',
    furnishing: 'Semi-Furnished',
    viewType: 'Ain Dubai + Sea + JBR',
    lastUpdated: '2026-03-02T16:45:00Z',
  },
  p6: {
    propertyId: 'p6',
    tagline: 'Crown Jewel of the Palm - Tip Frond Villa',
    description: 'Situated at the very tip of a Palm Jumeirah frond, this signature villa commands panoramic views of the Atlantis resort and the Arabian Gulf from three sides. The 15,000 square foot residence has been extensively upgraded by its current owner with no expense spared - featuring Italian marble throughout, a bespoke Bulthaup kitchen, and integrated Lutron lighting across all zones. The outdoor space is exceptional: a 50-meter private beach, temperature-controlled infinity pool with a swim-up bar, landscaped tropical gardens, and a floating deck that extends over the water. The property has been designed for year-round entertainment with an outdoor cinema, pizza oven, and a fully equipped pool house.',
    highlights: [
      'Tip location with 270-degree sea views',
      'Atlantis resort views from every level',
      '50-meter private beach frontage',
      'Temperature-controlled infinity pool with swim-up bar',
      'Floating water deck extending over the Gulf',
      'Bulthaup kitchen with La Cornue range',
    ],
    images: [
      { url: IMG('photo-1600596542815-ffad4c1539a9', 1200), caption: 'Tip villa with Atlantis backdrop', category: 'exterior' },
      { url: IMG('photo-1600607687644-c7171b42498f', 1200), caption: 'Grand double-height living gallery', category: 'living' },
      { url: IMG('photo-1600566753086-00f18fb6b3ea', 1200), caption: 'Sunset over private infinity pool', category: 'pool' },
      { url: IMG('photo-1600607687939-ce8a6c25118c', 1200), caption: 'Master suite with Atlantis view', category: 'bedroom' },
      { url: IMG('photo-1600585154340-be6161a56a0c', 1200), caption: 'Bulthaup kitchen with island seating', category: 'kitchen' },
    ],
    specs: { totalArea: 15000, plotSize: 26000, builtYear: 2021, floors: 2, bathrooms: 7, parking: 4, serviceCharge: 18 },
    amenities: ['Private Beach', 'Infinity Pool', 'Swim-up Bar', 'Floating Deck', 'Outdoor Cinema', 'Pool House', 'Pizza Oven', 'Landscaped Gardens', 'Smart Home', 'CCTV'],
    neighborhood: { walkScore: 38, nearbyLandmarks: ['Atlantis The Royal (5 min)', 'Nakheel Mall (8 min)', 'Aquaventure Waterpark (4 min)'], schoolDistrict: 'GEMS Wellington International', commuteToDowntown: '20 min via Palm Tunnel' },
    investment: { pricePerSqft: 9000, estimatedRentalYield: 3.5, capitalAppreciation5yr: 45, comparableRecentSale: 'Frond N Tip Villa - AED 161M (Feb 2026)', dldFee: 5400000 },
    developer: 'Nakheel',
    completionStatus: 'Ready',
    furnishing: 'Furnished',
    viewType: 'Panoramic Sea + Atlantis (270 degrees)',
    lastUpdated: '2026-03-04T12:00:00Z',
  },
  p7: {
    propertyId: 'p7',
    tagline: 'The Future of Urban Living at Dubai Creek Harbour',
    description: 'A sleek 2-bedroom apartment in one of Dubai Creek Harbour\'s most anticipated new towers, offering views of the Creek, Ras Al Khor Wildlife Sanctuary, and the emerging skyline anchored by the future Dubai Creek Tower. At 1,450 square feet, the apartment features clean contemporary lines, imported porcelain floors, and a fully integrated Siemens kitchen. The development offers exceptional communal facilities including a 50-meter Olympic pool, co-working spaces, a padel court, and landscaped podium gardens. This is a prime investment opportunity in one of Dubai\'s fastest-appreciating districts.',
    highlights: [
      'Creek and wildlife sanctuary views',
      'Brand new - ready Q1 2026',
      'Smart home pre-wired with Alexa integration',
      '50-meter Olympic pool and padel courts',
      'Prime investment in fastest-appreciating district',
    ],
    images: [
      { url: IMG('photo-1600047509807-ba8f99d2cdde', 1200), caption: 'Creek Harbour tower and waterfront', category: 'exterior' },
      { url: IMG('photo-1600210492493-0946911123ea', 1200), caption: 'Bright open living with creek views', category: 'living' },
      { url: IMG('photo-1600585154526-990dced4db0d', 1200), caption: 'Contemporary bedroom with nature views', category: 'bedroom' },
      { url: IMG('photo-1600573472592-401b489a3cdc', 1200), caption: 'Modern bathroom with walk-in shower', category: 'bathroom' },
      { url: IMG('photo-1582407947304-fd86f028f716', 1200), caption: 'Creek Harbour district aerial view', category: 'view' },
    ],
    specs: { totalArea: 1450, builtYear: 2026, floors: 1, bathrooms: 2, parking: 1, serviceCharge: 28 },
    amenities: ['Olympic Pool', 'Padel Court', 'Co-working Space', 'Gym', 'Yoga Studio', 'Kids Play Area', 'Landscaped Gardens', 'BBQ Area', 'Retail Podium'],
    neighborhood: { walkScore: 72, nearbyLandmarks: ['Ras Al Khor Sanctuary (adjacent)', 'Dubai Festival City (5 min)', 'Dubai Creek Tower (future)'], schoolDistrict: 'Hartland International School', commuteToDowntown: '10 min via Al Khail Road' },
    investment: { pricePerSqft: 12414, estimatedRentalYield: 6.8, capitalAppreciation5yr: 55, comparableRecentSale: 'Creek Gate 2BR - AED 4.2M (Mar 2026)', dldFee: 720000 },
    developer: 'Emaar Properties',
    completionStatus: 'Ready',
    furnishing: 'Unfurnished',
    viewType: 'Creek + Wildlife Sanctuary',
    lastUpdated: '2026-03-05T11:30:00Z',
  },
  p8: {
    propertyId: 'p8',
    tagline: 'A Private Botanical Sanctuary in the Heart of Dubai',
    description: 'Nestled within 14 million square feet of landscaped botanical gardens, Al Barari represents Dubai\'s most exclusive green community. This 6-bedroom villa sits on a lush, oversized plot with mature trees, flowing streams, and therapeutic herb gardens. The architecture blends Balinese resort living with contemporary luxury - open pavilion-style spaces flow seamlessly into gardens. Inside, reclaimed teak beams, hand-carved stone, and floor-to-ceiling glass create an atmosphere of serene sophistication. The master suite opens onto a private courtyard with a soaking pool. The community\'s award-winning Heart & Soul spa, organic farm, and nature trails are exclusive to residents.',
    highlights: [
      '14 million sqft botanical garden community',
      'Oversized plot with mature trees and streams',
      'Balinese-inspired open pavilion architecture',
      'Private courtyard soaking pool off master suite',
      'Access to Heart & Soul spa and organic farm',
      'One of the most exclusive communities in Dubai',
    ],
    images: [
      { url: IMG('photo-1600596542815-ffad4c1539a9', 1200), caption: 'Villa nestled in tropical gardens', category: 'exterior' },
      { url: IMG('photo-1600607687644-c7171b42498f', 1200), caption: 'Open pavilion living with garden views', category: 'living' },
      { url: IMG('photo-1600566753190-17f0baa2a6c3', 1200), caption: 'Courtyard soaking pool surrounded by gardens', category: 'pool' },
      { url: IMG('photo-1600210491892-ed2e3abf5a08', 1200), caption: 'Master suite with private courtyard', category: 'bedroom' },
      { url: IMG('photo-1600585154340-be6161a56a0c', 1200), caption: 'Kitchen with reclaimed teak and natural stone', category: 'kitchen' },
    ],
    specs: { totalArea: 12000, plotSize: 38000, builtYear: 2018, floors: 2, bathrooms: 7, parking: 4, serviceCharge: 10 },
    amenities: ['Tropical Gardens', 'Private Soaking Pool', 'Community Spa', 'Organic Farm', 'Nature Trails', 'Kids Play Areas', 'Tennis Courts', 'Fitness Centre', 'Cafe'],
    neighborhood: { walkScore: 22, nearbyLandmarks: ['Heart & Soul Spa (5 min walk)', 'Body Language Gym (3 min)', 'Dubai Autodrome (5 min)'], schoolDistrict: 'Fairgreen International School', commuteToDowntown: '20 min via Al Ain Road' },
    investment: { pricePerSqft: 3500, estimatedRentalYield: 2.8, capitalAppreciation5yr: 28, comparableRecentSale: 'Type B5 Villa - AED 38M (Jan 2026)', dldFee: 1680000 },
    developer: 'Al Barari',
    architect: 'Benoy',
    completionStatus: 'Ready',
    furnishing: 'Semi-Furnished',
    viewType: 'Tropical Gardens + Streams',
    lastUpdated: '2026-02-28T14:20:00Z',
  },
  p9: {
    propertyId: 'p9',
    tagline: 'Elevated City Living in the Financial Heart',
    description: 'A sophisticated 3-bedroom apartment in the heart of Dubai International Financial Centre, designed for the executive who values proximity to power. At 2,800 square feet, the residence occupies a premium high floor with views stretching from the Burj Khalifa to the World Trade Centre. The fit-out is corporate luxe - dark oak herringbone floors, Dornbracht fixtures, integrated Gaggenau kitchen, and bespoke wardrobes. The building is connected to Gate Avenue, DIFC\'s premier lifestyle destination, offering direct access to galleries, restaurants, and boutiques without stepping outside. For the client who defines luxury as having everything within arm\'s reach.',
    highlights: [
      'Walk-to-work convenience in DIFC',
      'Connected to Gate Avenue lifestyle precinct',
      'Corporate-luxe interiors with premium European finishes',
      'High-floor position with Burj Khalifa views',
      'Access to DIFC Art Nights and cultural programme',
    ],
    images: [
      { url: IMG('photo-1600047509807-ba8f99d2cdde', 1200), caption: 'DIFC skyline and tower exterior', category: 'exterior' },
      { url: IMG('photo-1600210492493-0946911123ea', 1200), caption: 'Executive living with city views', category: 'living' },
      { url: IMG('photo-1600585154526-990dced4db0d', 1200), caption: 'Sophisticated bedroom suite', category: 'bedroom' },
      { url: IMG('photo-1600573472592-401b489a3cdc', 1200), caption: 'Designer bathroom with premium fixtures', category: 'bathroom' },
      { url: IMG('photo-1582407947304-fd86f028f716', 1200), caption: 'City panorama from the residence', category: 'view' },
    ],
    specs: { totalArea: 2800, builtYear: 2024, floors: 1, bathrooms: 4, parking: 2, serviceCharge: 55 },
    amenities: ['Concierge', 'Gym', 'Pool', 'Sauna', 'Business Centre', 'Connected to Gate Avenue', 'Valet Parking', 'Security 24/7'],
    neighborhood: { walkScore: 95, nearbyLandmarks: ['Gate Avenue (connected)', 'Dubai Opera (8 min walk)', 'Emirates Towers (3 min walk)', 'ICD Brookfield (adjacent)'], schoolDistrict: 'GEMS Wellington Academy', commuteToDowntown: '5 min walk' },
    investment: { pricePerSqft: 10000, estimatedRentalYield: 5.5, capitalAppreciation5yr: 30, comparableRecentSale: 'Index Tower 3BR - AED 26M (Feb 2026)', dldFee: 1120000 },
    developer: 'Brookfield Asset Management',
    completionStatus: 'Ready',
    furnishing: 'Furnished',
    viewType: 'Burj Khalifa + DIFC Skyline',
    lastUpdated: '2026-03-03T09:45:00Z',
  },
  p10: {
    propertyId: 'p10',
    tagline: 'An Exceptional Island Mansion with Private Marina Berth',
    description: 'Commanding one of the largest waterfront plots on Jumeirah Bay Island, this 8-bedroom mansion is a once-in-a-generation acquisition. The 22,000 square foot residence was designed by a renowned Middle Eastern architect blending contemporary geometry with traditional Islamic mashrabiya screens. Triple-height glazing in the central reception gallery frames the Dubai skyline like a living artwork. The outdoor realm is equally spectacular: a 40-meter private dock accommodating a yacht up to 80 feet, a seawater-cooled infinity pool, manicured Japanese gardens, and a rooftop entertaining terrace with a retractable glass ceiling. The island itself offers exceptional privacy with gated access and a boutique community of only 80 residences.',
    highlights: [
      'Private marina berth for yacht up to 80ft',
      'One of only 80 residences on gated Jumeirah Bay Island',
      'Triple-height reception gallery with Dubai skyline views',
      'Islamic mashrabiya-inspired contemporary architecture',
      'Japanese gardens with koi ponds and meditation pavilion',
      'Rooftop terrace with retractable glass ceiling',
    ],
    images: [
      { url: IMG('photo-1613490493576-7fde63acd811', 1200), caption: 'Waterfront mansion with private dock', category: 'exterior' },
      { url: IMG('photo-1600607687939-ce8a6c25118c', 1200), caption: 'Triple-height reception gallery', category: 'living' },
      { url: IMG('photo-1600566753190-17f0baa2a6c3', 1200), caption: 'Infinity pool with skyline panorama', category: 'pool' },
      { url: IMG('photo-1600210491892-ed2e3abf5a08', 1200), caption: 'Master wing with sea view terrace', category: 'bedroom' },
      { url: IMG('photo-1600566753086-00f18fb6b3ea', 1200), caption: 'Japanese gardens and koi pond', category: 'garden' },
    ],
    specs: { totalArea: 22000, plotSize: 35000, builtYear: 2023, floors: 3, bathrooms: 10, parking: 6, serviceCharge: 22 },
    amenities: ['Private Dock', 'Infinity Pool', 'Japanese Gardens', 'Koi Pond', 'Meditation Pavilion', 'Rooftop Terrace', 'Home Cinema', 'Wine Cellar', 'Staff Quarters', 'Smart Home', 'CCTV', 'Gated Community'],
    neighborhood: { walkScore: 45, nearbyLandmarks: ['Bulgari Resort (adjacent)', 'Four Seasons DIFC (5 min)', 'La Mer Beach (3 min)'], schoolDistrict: 'GEMS Jumeirah Primary', commuteToDowntown: '8 min via Al Safa Road' },
    investment: { pricePerSqft: 7500, estimatedRentalYield: 2.2, capitalAppreciation5yr: 52, comparableRecentSale: 'JBI Mansion Plot 22 - AED 180M (Dec 2025)', dldFee: 6600000 },
    developer: 'Meraas',
    architect: 'OMA (Rem Koolhaas)',
    completionStatus: 'Ready',
    furnishing: 'Semi-Furnished',
    viewType: 'Panoramic Sea + Dubai Skyline',
    lastUpdated: '2026-03-01T17:00:00Z',
  },
}

// Generate price history for all properties
function generatePriceHistory(currentPrice: number, propertyId: string): { date: string; price: number; event?: string }[] {
  const seed = propertyId.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const rng = (i: number) => { const s = Math.sin(seed * 9301 + i * 49297) * 49297; return s - Math.floor(s) }
  const history: { date: string; price: number; event?: string }[] = []
  const months = 12
  let price = currentPrice * (0.82 + rng(0) * 0.1) // Start ~85% of current
  const events = ['Listed', 'Price Adjustment', 'Offer Received', 'Relisted', 'Price Reduced', 'Price Increased']
  for (let i = 0; i < months; i++) {
    const date = new Date(2025, 3 + i, 1)
    const change = (rng(i + 1) - 0.35) * 0.04 // Slight upward bias
    price = price * (1 + change)
    const entry: { date: string; price: number; event?: string } = {
      date: date.toISOString().split('T')[0],
      price: Math.round(price),
    }
    if (i === 0) entry.event = 'Listed'
    else if (i === months - 1) price = currentPrice
    else if (rng(i + 10) > 0.7) entry.event = events[Math.floor(rng(i + 20) * events.length)]
    history.push(entry)
  }
  // Ensure last entry is current price
  history.push({ date: '2026-03-01', price: currentPrice, event: 'Current' })
  return history
}

// Auto-populate price histories
Object.entries(propertyDetails).forEach(([id, detail]) => {
  const prop = properties.find(p => p.id === id)
  if (prop && !detail.priceHistory?.length) {
    detail.priceHistory = generatePriceHistory(prop.price, id)
  }
})

export function getPropertyDetail(propertyId: string): PropertyDetail | undefined {
  return propertyDetails[propertyId]
}

// ============================================================
// MARKET INTELLIGENCE — SUPPLY/DEMAND, MACRO, MOMENTUM
// ============================================================

export interface SupplyDemandMetric {
  area: string
  monthsOfSupply: number      // < 3 = seller's market, 3-6 = balanced, > 6 = buyer's
  absorptionRate: number       // positive = demand > supply, negative = oversupplied
  pctAboveAsk: number          // % of deals closing above asking price
  newListings30d: number
  pendingSales30d: number
  inventoryVs12moAvg: number   // % above or below 12-month avg
}

export const supplyDemandByArea: SupplyDemandMetric[] = [
  { area: 'Palm Jumeirah', monthsOfSupply: 2.1, absorptionRate: 18, pctAboveAsk: 42, newListings30d: 14, pendingSales30d: 22, inventoryVs12moAvg: -15 },
  { area: 'Emirates Hills', monthsOfSupply: 3.4, absorptionRate: 8, pctAboveAsk: 31, newListings30d: 8, pendingSales30d: 11, inventoryVs12moAvg: -8 },
  { area: 'Dubai Marina', monthsOfSupply: 4.8, absorptionRate: 2, pctAboveAsk: 18, newListings30d: 38, pendingSales30d: 32, inventoryVs12moAvg: 5 },
  { area: 'Downtown Dubai', monthsOfSupply: 3.9, absorptionRate: 6, pctAboveAsk: 24, newListings30d: 29, pendingSales30d: 28, inventoryVs12moAvg: -2 },
  { area: 'Jumeirah Bay', monthsOfSupply: 1.8, absorptionRate: 24, pctAboveAsk: 56, newListings30d: 5, pendingSales30d: 9, inventoryVs12moAvg: -22 },
  { area: 'Bluewaters Island', monthsOfSupply: 5.2, absorptionRate: -3, pctAboveAsk: 12, newListings30d: 11, pendingSales30d: 8, inventoryVs12moAvg: 12 },
  { area: 'Dubai Creek', monthsOfSupply: 6.1, absorptionRate: -5, pctAboveAsk: 8, newListings30d: 15, pendingSales30d: 10, inventoryVs12moAvg: 18 },
  { area: 'DIFC', monthsOfSupply: 4.2, absorptionRate: 4, pctAboveAsk: 20, newListings30d: 12, pendingSales30d: 13, inventoryVs12moAvg: -1 },
  { area: 'Al Barari', monthsOfSupply: 3.0, absorptionRate: 12, pctAboveAsk: 35, newListings30d: 6, pendingSales30d: 9, inventoryVs12moAvg: -11 },
]

export interface MacroIndicator {
  id: string
  label: string
  value: string
  trend: number           // % change
  sparkline: number[]     // 6 data points
  unit?: string
  category: 'rates' | 'currency' | 'economy' | 'volume' | 'capital' | 'pipeline'
}

export const macroIndicators: MacroIndicator[] = [
  { id: 'mortgage', label: 'Mortgage Rate (UAE)', value: '4.49%', trend: -0.25, sparkline: [5.1, 4.95, 4.85, 4.72, 4.55, 4.49], category: 'rates' },
  { id: 'usd_aed', label: 'USD / AED', value: '3.6725', trend: 0.01, sparkline: [3.6725, 3.6725, 3.6725, 3.6725, 3.6725, 3.6725], category: 'currency' },
  { id: 'gbp_aed', label: 'GBP / AED', value: '4.72', trend: 2.1, sparkline: [4.58, 4.61, 4.64, 4.67, 4.70, 4.72], category: 'currency' },
  { id: 'eur_aed', label: 'EUR / AED', value: '4.08', trend: 1.4, sparkline: [3.98, 4.01, 4.02, 4.04, 4.06, 4.08], category: 'currency' },
  { id: 'dld_volume', label: 'DLD Transactions (Mar)', value: '12,847', trend: 23.7, sparkline: [8200, 9100, 10400, 11200, 11900, 12847], category: 'volume' },
  { id: 'dld_value', label: 'Transaction Value', value: 'AED 38.2B', trend: 18.5, sparkline: [28, 30, 32, 34, 36, 38.2], category: 'volume' },
  { id: 'foreign_pct', label: 'Foreign Buyer Share', value: '44%', trend: 6.2, sparkline: [38, 39, 41, 42, 43, 44], category: 'capital' },
  { id: 'gdp_growth', label: 'Dubai GDP Growth', value: '3.8%', trend: 0.4, sparkline: [3.1, 3.2, 3.4, 3.5, 3.7, 3.8], category: 'economy' },
  { id: 'pipeline', label: 'Off-Plan Deliveries (12mo)', value: '42,300', trend: 15.2, sparkline: [32000, 34500, 36800, 38400, 40100, 42300], category: 'pipeline' },
  { id: 'ultra_luxury_vol', label: 'Ultra-Luxury (100M+) Deals', value: '23', trend: 44, sparkline: [12, 14, 16, 18, 20, 23], category: 'volume' },
]

export type MomentumType = 'heating' | 'cooling' | 'warning' | 'opportunity'

export interface MomentumSignal {
  id: string
  area: string
  signal: string
  type: MomentumType
  metric: string       // the data point driving the signal
  change: number       // % change
  timeframe: string    // e.g. "7 days", "30 days"
  timestamp: string
}

export const momentumSignals: MomentumSignal[] = [
  { id: 'ms1', area: 'Jumeirah Bay', signal: '3 bidding wars this week — ultra-prime demand accelerating', type: 'heating', metric: 'Bidding Wars', change: 200, timeframe: '7 days', timestamp: '2026-03-08T08:00:00Z' },
  { id: 'ms2', area: 'Palm Jumeirah', signal: 'Villa inventory at 18-month low, 2.1 months of supply', type: 'heating', metric: 'Months of Supply', change: -34, timeframe: '30 days', timestamp: '2026-03-07T14:00:00Z' },
  { id: 'ms3', area: 'Dubai Creek', signal: 'Developer inventory rising +18%, absorption slowing', type: 'warning', metric: 'Developer Stock', change: 18, timeframe: '30 days', timestamp: '2026-03-07T10:00:00Z' },
  { id: 'ms4', area: 'Downtown Dubai', signal: 'Foreign buyer inquiries up 28% — GBP strength driving UK demand', type: 'opportunity', metric: 'Foreign Inquiries', change: 28, timeframe: '30 days', timestamp: '2026-03-06T16:00:00Z' },
  { id: 'ms5', area: 'Bluewaters Island', signal: '4 price reductions in 10 days across luxury segment', type: 'cooling', metric: 'Price Reductions', change: -8, timeframe: '10 days', timestamp: '2026-03-06T09:00:00Z' },
  { id: 'ms6', area: 'Emirates Hills', signal: 'Emaar "The Oasis" pre-launch driving spillover demand', type: 'opportunity', metric: 'New Inquiries', change: 45, timeframe: '14 days', timestamp: '2026-03-05T11:00:00Z' },
  { id: 'ms7', area: 'Al Barari', signal: '35% of recent sales above asking — eco-luxury premium holding', type: 'heating', metric: 'Above Ask %', change: 12, timeframe: '30 days', timestamp: '2026-03-05T08:00:00Z' },
  { id: 'ms8', area: 'DIFC', signal: 'New DLD fee structure takes effect April 1 — rush of pre-registrations', type: 'warning', metric: 'Regulatory', change: 0, timeframe: '24 days', timestamp: '2026-03-04T14:00:00Z' },
  { id: 'ms9', area: 'Dubai Marina', signal: 'Rental yields compressing — 4.8mo supply approaching buyer territory', type: 'cooling', metric: 'Yield Spread', change: -15, timeframe: '90 days', timestamp: '2026-03-04T10:00:00Z' },
  { id: 'ms10', area: 'Palm Jumeirah', signal: 'Indian UHNW inquiries surge +62% after tax treaty update', type: 'opportunity', metric: 'Inquiry Volume', change: 62, timeframe: '14 days', timestamp: '2026-03-03T09:00:00Z' },
]
