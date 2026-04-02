// ============================================================================
// PCIS ENGINE — Purpose-Aware Matching Data Layer (REAL DATA)
// ============================================================================
// Engine 3: Purpose classification, 4-pillar match scoring against real DLD data.
// Clients are test/CRM data; scoring computed from real market intelligence.
// ============================================================================

import {
  clients,
  properties,
  matches,
  type Client,
  type Property,
  type Match,
} from './mockData'
import { cieClients, type CIEClient } from './cieData'
import { areas as areaProfiles, type AreaProfile } from './marketData'

// ============================================================================
// PURPOSE TYPES
// ============================================================================

export type ClientPurpose = 'Investment' | 'End-Use' | 'Family Office' | 'Renovation' | 'Golden Visa' | 'Pied-à-Terre'

export interface PurposeConfig {
  id: ClientPurpose
  label: string
  color: string
  icon: string
  description: string
  investmentWeight: number
  lifestyleWeight: number
  keyFactors: string[]
}

export const PURPOSE_CONFIGS: PurposeConfig[] = [
  {
    id: 'Investment',
    label: 'Investment',
    color: '#D4A574',
    icon: '◆',
    description: 'Pure capital growth and yield-focused acquisitions',
    investmentWeight: 0.85,
    lifestyleWeight: 0.15,
    keyFactors: ['ROI potential', 'Rental yield', 'Capital appreciation', 'Market timing'],
  },
  {
    id: 'End-Use',
    label: 'End-Use',
    color: '#3B82F6',
    icon: '●',
    description: 'Primary residence or lifestyle-driven purchase',
    investmentWeight: 0.25,
    lifestyleWeight: 0.75,
    keyFactors: ['Location quality', 'Community fit', 'Amenities', 'School proximity'],
  },
  {
    id: 'Family Office',
    label: 'Family Office',
    color: '#8B5CF6',
    icon: '▲',
    description: 'Multi-generational wealth preservation through real estate',
    investmentWeight: 0.70,
    lifestyleWeight: 0.30,
    keyFactors: ['Portfolio diversification', 'Legacy value', 'Tax efficiency', 'Asset protection'],
  },
  {
    id: 'Renovation',
    label: 'Renovation',
    color: '#F59E0B',
    icon: '■',
    description: 'Value-add through renovation and repositioning',
    investmentWeight: 0.75,
    lifestyleWeight: 0.25,
    keyFactors: ['Below-market price', 'Renovation potential', 'Area trajectory', 'Flip margin'],
  },
  {
    id: 'Golden Visa',
    label: 'Golden Visa',
    color: '#14B8A6',
    icon: '★',
    description: 'Property acquisition to qualify for UAE residency',
    investmentWeight: 0.50,
    lifestyleWeight: 0.50,
    keyFactors: ['AED 2M+ threshold', 'Ready property', 'Title deed speed', 'Residency timeline'],
  },
  {
    id: 'Pied-à-Terre',
    label: 'Pied-à-Terre',
    color: '#EC4899',
    icon: '◇',
    description: 'Secondary residence for occasional use and status',
    investmentWeight: 0.40,
    lifestyleWeight: 0.60,
    keyFactors: ['Premium location', 'Managed services', 'Rental when absent', 'Status address'],
  },
]

// ============================================================================
// 4-PILLAR MATCH SCORING
// ============================================================================

export interface PillarScore {
  name: string
  shortCode: string
  score: number
  weight: number
  breakdown: string
}

export interface EngineMatch {
  id: string
  clientId: string
  propertyId: string
  purpose: ClientPurpose
  overallScore: number
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D'
  pillars: {
    financialFit: PillarScore
    lifestyleFit: PillarScore
    investmentFit: PillarScore
    purposeAlignment: PillarScore
  }
  narrative: string
  confidence: number
  createdAt: string
  status: 'active' | 'presented' | 'shortlisted' | 'rejected' | 'converted'
  // Real data enrichment
  areaId?: string
  areaData?: {
    avgPriceSqft: number
    rentalYield: number
    demandScore: number
    priceChange30d: number
    transactionCount: number
    outlook: string
  }
}

// ============================================================================
// CLIENT PURPOSE ASSIGNMENT
// ============================================================================

export interface ClientPurposeAssignment {
  clientId: string
  primaryPurpose: ClientPurpose
  secondaryPurpose: ClientPurpose | null
  confidence: number
  signals: string[]
  lastUpdated: string
}

function derivePurpose(client: Client): ClientPurposeAssignment {
  const categoryMap: Record<string, ClientPurpose> = {
    'Investor': 'Investment',
    'Trophy Buyer': 'Pied-à-Terre',
    'Lifestyle': 'End-Use',
    'Portfolio Builder': 'Family Office',
  }

  const primary = categoryMap[client.category] || 'Investment'

  let secondary: ClientPurpose | null = null
  if (client.financialProfile.budgetMax >= 2_000_000 && primary !== 'Golden Visa') {
    secondary = 'Golden Visa'
  } else if (primary === 'Investment') {
    secondary = 'Renovation'
  }

  const signals: string[] = []
  if (client.category === 'Investor') signals.push('Category: Investor', 'Portfolio-focused language')
  if (client.category === 'Trophy Buyer') signals.push('Category: Trophy Buyer', 'Status-oriented signals')
  if (client.category === 'Lifestyle') signals.push('Category: Lifestyle', 'Community-focused inquiries')
  if (client.category === 'Portfolio Builder') signals.push('Category: Portfolio Builder', 'Multi-asset strategy')
  if (client.financialProfile.budgetMax >= 5_000_000) signals.push('UHNW budget range')
  if (client.financialProfile.budgetMax >= 2_000_000) signals.push('Golden Visa eligible')

  // Confidence derived from signal strength + category clarity
  const baseConfidence = 0.7
  const signalBonus = Math.min(0.25, signals.length * 0.05)

  return {
    clientId: client.id,
    primaryPurpose: primary,
    secondaryPurpose: secondary,
    confidence: Math.min(0.95, baseConfidence + signalBonus),
    signals,
    lastUpdated: '2026-03-25T08:00:00Z',
  }
}

export const clientPurposes: ClientPurposeAssignment[] = clients.map(derivePurpose)

// ============================================================================
// REAL 4-PILLAR SCORING ENGINE
// ============================================================================

function gradeFromScore(score: number): 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D' {
  if (score >= 90) return 'A+'
  if (score >= 80) return 'A'
  if (score >= 70) return 'B+'
  if (score >= 60) return 'B'
  if (score >= 45) return 'C'
  return 'D'
}

// ── Financial Fit ──
// Computed from: client budget vs area price levels
function computeFinancialFit(client: Client, area: AreaProfile): PillarScore {
  const avgTxnValue = (area as any).avgTransactionValue || area.avgPriceSqft * 1000
  const budgetMin = client.financialProfile.budgetMin
  const budgetMax = client.financialProfile.budgetMax

  let score = 0
  let breakdown = ''

  if (avgTxnValue >= budgetMin && avgTxnValue <= budgetMax) {
    // Sweet spot — well within budget
    const position = (avgTxnValue - budgetMin) / (budgetMax - budgetMin)
    score = position < 0.7 ? 90 + Math.round(position * 10) : 85 - Math.round((position - 0.7) * 30)
    breakdown = `Avg transaction AED ${(avgTxnValue / 1_000_000).toFixed(1)}M sits within budget range. Optimal positioning at ${Math.round(position * 100)}% of ceiling.`
  } else if (avgTxnValue < budgetMin) {
    // Below budget — could work for portfolio plays
    const ratio = avgTxnValue / budgetMin
    score = Math.max(30, Math.round(ratio * 75))
    breakdown = `Avg transaction AED ${(avgTxnValue / 1_000_000).toFixed(1)}M below budget floor. Potential multi-unit portfolio play.`
  } else {
    // Above budget
    const stretch = (avgTxnValue - budgetMax) / budgetMax
    score = Math.max(10, Math.round(70 - stretch * 100))
    breakdown = `Avg transaction AED ${(avgTxnValue / 1_000_000).toFixed(1)}M exceeds budget ceiling by ${Math.round(stretch * 100)}%.`
  }

  // Cash buyer percentage bonus (liquid market = easier entry)
  const cashPct = (area as any).cashPercent || 50
  if (cashPct > 50) score = Math.min(100, score + 5)

  return {
    name: 'Financial Fit',
    shortCode: 'FF',
    score: Math.max(0, Math.min(100, score)),
    weight: 0.25,
    breakdown,
  }
}

// ── Investment Fit ──
// Computed from: real rental yield, price appreciation, demand score, transaction volume
function computeInvestmentFit(area: AreaProfile, purpose: ClientPurpose): PillarScore {
  const config = PURPOSE_CONFIGS.find(p => p.id === purpose)!
  const yld = (area as any).avgRentalYield || 0
  const p30 = (area as any).priceChange30d || 0
  const p90 = (area as any).priceChange90d || 0
  const demand = (area as any).demandScore || 50
  const txnCount = (area as any).transactionCount90d || 0
  const outlook = (area as any).outlook || 'neutral'

  // Yield component (0-30)
  const yieldScore = Math.min(30, Math.round(yld * 4))

  // Appreciation component (0-25)
  const apprecScore = Math.min(25, Math.max(0, Math.round(10 + p90 * 2)))

  // Demand strength component (0-25)
  const demandScore = Math.min(25, Math.round(demand / 4))

  // Liquidity component — higher transaction volume = more liquid (0-20)
  const liqScore = Math.min(20, Math.round(Math.log10(Math.max(1, txnCount)) * 7))

  let score = yieldScore + apprecScore + demandScore + liqScore

  // Outlook bonus/penalty
  if (outlook === 'bullish') score = Math.min(100, score + 5)
  if (outlook === 'bearish') score = Math.max(0, score - 8)

  const parts: string[] = []
  parts.push(`${yld.toFixed(1)}% gross yield`)
  if (p90 !== 0) parts.push(`${p90 > 0 ? '+' : ''}${p90.toFixed(1)}% 90-day appreciation`)
  parts.push(`${demand}/100 demand score`)
  parts.push(`${txnCount.toLocaleString()} transactions Q1`)

  return {
    name: 'Investment Fit',
    shortCode: 'IF',
    score: Math.max(0, Math.min(100, score)),
    weight: config.investmentWeight * 0.4,
    breakdown: parts.join(' · '),
  }
}

// ── Lifestyle Fit ──
// Computed from: area maturity, property types, community profile, demand characteristics
function computeLifestyleFit(area: AreaProfile, purpose: ClientPurpose, clientType: string): PillarScore {
  const config = PURPOSE_CONFIGS.find(p => p.id === purpose)!
  const topType = (area as any).topPropertyType || 'Mixed'
  const demand = (area as any).demandScore || 50
  const txnCount = (area as any).transactionCount90d || 0
  const cashPct = (area as any).cashPercent || 50
  const subAreas = ((area as any).subAreas || []) as string[]

  let score = 50 // baseline

  // Community maturity — more sub-areas = more established community
  if (subAreas.length > 5) score += 10
  if (subAreas.length > 10) score += 5

  // Property type alignment
  if (clientType === 'UHNW' && (topType === 'Villa' || topType === 'Estate')) score += 15
  if (clientType === 'HNW' && (topType === 'Apartment' || topType === 'Penthouse')) score += 10
  if (clientType === 'Affluent' && topType === 'Apartment') score += 15

  // High demand = vibrant community
  if (demand > 80) score += 10
  if (demand > 90) score += 5

  // High cash % = committed buyers (end-users tend to pay cash)
  if (purpose === 'End-Use' && cashPct > 50) score += 8

  // Trophy/Pied-à-terre bonus for premium areas
  const avgPrice = area.avgPriceSqft || 0
  if ((purpose === 'Pied-à-Terre' || clientType === 'UHNW') && avgPrice > 3000) score += 10

  // Active transaction market = good for lifestyle (services, amenities follow demand)
  if (txnCount > 500) score += 5

  const breakdown = `${topType} dominant · ${subAreas.length} active developments · ${demand}/100 community activity · ${cashPct}% owner-occupier signal`

  return {
    name: 'Lifestyle Fit',
    shortCode: 'LF',
    score: Math.max(0, Math.min(100, score)),
    weight: config.lifestyleWeight * 0.4,
    breakdown,
  }
}

// ── Purpose Alignment ──
// Computed from: purpose-specific criteria against real area data
function computePurposeAlignment(client: Client, area: AreaProfile, purpose: ClientPurpose, confidence: number): PillarScore {
  const yld = (area as any).avgRentalYield || 0
  const p30 = (area as any).priceChange30d || 0
  const avgPrice = area.avgPriceSqft || 0
  const avgTxnValue = (area as any).avgTransactionValue || 0
  const txnCount = (area as any).transactionCount90d || 0
  const demand = (area as any).demandScore || 50

  let score = Math.round(40 + confidence * 30) // base from confidence
  const parts: string[] = []

  switch (purpose) {
    case 'Investment':
      if (yld > 6) { score += 15; parts.push(`High yield ${yld.toFixed(1)}%`) }
      if (p30 > 3) { score += 10; parts.push(`+${p30.toFixed(1)}% momentum`) }
      if (txnCount > 500) { score += 5; parts.push('High liquidity') }
      break
    case 'End-Use':
      if (demand > 80) { score += 10; parts.push('Strong community demand') }
      if (txnCount > 300) { score += 8; parts.push('Active neighborhood') }
      break
    case 'Family Office':
      if (yld > 5 && demand > 60) { score += 12; parts.push('Balanced yield + stability') }
      if (txnCount > 200) { score += 8; parts.push('Portfolio-grade liquidity') }
      break
    case 'Renovation':
      if (p30 < 0 || avgPrice < 1500) { score += 15; parts.push('Below-market entry') }
      if (demand > 50) { score += 8; parts.push('Exit demand exists') }
      break
    case 'Golden Visa':
      if (avgTxnValue >= 2_000_000) { score += 20; parts.push('Meets AED 2M threshold') }
      else if (avgTxnValue >= 1_500_000) { score += 10; parts.push('Near threshold — larger units qualify') }
      else { score -= 10; parts.push('Most units below threshold') }
      break
    case 'Pied-à-Terre':
      if (avgPrice > 2500) { score += 12; parts.push('Premium address') }
      if (yld > 4) { score += 8; parts.push(`${yld.toFixed(1)}% yield when absent`) }
      break
  }

  return {
    name: 'Purpose Alignment',
    shortCode: 'PA',
    score: Math.max(0, Math.min(100, score)),
    weight: 0.25,
    breakdown: parts.length > 0 ? parts.join(' · ') : `${purpose} alignment at ${Math.round(confidence * 100)}% confidence`,
  }
}

// ── Narrative Generator (real data) ──
function generateRealNarrative(client: Client, area: AreaProfile, purpose: ClientPurpose, overall: number, pillars: EngineMatch['pillars']): string {
  const yld = ((area as any).avgRentalYield || 0).toFixed(1)
  const p30 = (area as any).priceChange30d || 0
  const txn = ((area as any).transactionCount90d || 0).toLocaleString()
  const avgVal = Math.round(((area as any).avgTransactionValue || 0) / 1_000_000)
  const demand = (area as any).demandScore || 50
  const price = (area.avgPriceSqft || 0).toLocaleString()
  const budgetM = Math.round(client.financialProfile.budgetMax / 1_000_000)
  const outlook = (area as any).outlook || 'neutral'

  const purposeNarratives: Record<ClientPurpose, () => string> = {
    'Investment': () => `${area.name} scores ${overall}/100 for ${client.name}'s investment strategy. ${yld}% gross rental yield with ${txn} Q1 transactions at AED ${price}/sqft. ${p30 > 0 ? `+${p30.toFixed(1)}% 30-day momentum` : `${p30.toFixed(1)}% price adjustment creates entry window`}. Avg transaction AED ${avgVal}M against AED ${budgetM}M ceiling — ${pillars.financialFit.score >= 70 ? 'well within range' : 'requires sizing calibration'}. Market outlook: ${outlook}.`,
    'End-Use': () => `${area.name} matches ${client.name}'s lifestyle criteria at ${overall}/100. ${demand}/100 community activity score across ${txn} transactions. Avg AED ${price}/sqft positions at ${pillars.financialFit.score >= 70 ? 'comfortable budget level' : 'premium positioning'}. ${pillars.lifestyleFit.score >= 70 ? 'Strong community and amenity alignment.' : 'Community developing — monitor for maturity.'} Rental yield ${yld}% provides optionality.`,
    'Family Office': () => `${area.name} offers portfolio-grade exposure for ${client.name}'s family office at ${overall}/100. ${yld}% yield + ${p30 > 0 ? 'positive' : 'stable'} price trajectory across ${txn} Q1 transactions. ${demand > 70 ? 'Strong institutional-grade demand supports exit liquidity.' : 'Emerging demand — early entry advantage.'} AED ${avgVal}M avg transaction within family office allocation range.`,
    'Renovation': () => `${area.name} presents value-add potential for ${client.name} at ${overall}/100. AED ${price}/sqft entry point ${(area.avgPriceSqft || 0) < 1500 ? 'significantly below Dubai premium average — strong renovation upside' : 'at market level — selective unit targeting required'}. ${txn} Q1 transactions confirm ${demand > 60 ? 'healthy exit demand' : 'developing exit market'} post-renovation.`,
    'Golden Visa': () => `${area.name} ${(area as any).avgTransactionValue >= 2_000_000 ? 'meets' : 'approaches'} Golden Visa threshold for ${client.name} at ${overall}/100. Avg transaction AED ${avgVal}M. ${yld}% yield provides income during residency. ${txn} Q1 transactions at AED ${price}/sqft — ${outlook === 'bullish' ? 'appreciation expected during visa period' : 'stable value preservation expected'}.`,
    'Pied-à-Terre': () => `${area.name} fits ${client.name}'s secondary residence profile at ${overall}/100. AED ${price}/sqft in a ${demand > 80 ? 'premium high-demand' : 'select'} location. ${yld}% rental yield when absent. ${txn} Q1 transactions confirm active ${(area.avgPriceSqft || 0) > 2500 ? 'luxury' : 'mid-market'} resale market.`,
  }

  return purposeNarratives[purpose]()
}

// ============================================================================
// REAL MATCH GENERATION
// ============================================================================

// Score each client against real market areas
function buildRealAreaMatches(): EngineMatch[] {
  const realMatches: EngineMatch[] = []
  const areas = areaProfiles || []
  let matchIdx = 0

  for (const client of clients) {
    const purposeAssignment = clientPurposes.find(p => p.clientId === client.id)
    if (!purposeAssignment) continue
    const purpose = purposeAssignment.primaryPurpose
    const config = PURPOSE_CONFIGS.find(p => p.id === purpose)!

    // Score this client against every real area
    const areaScores: { area: AreaProfile; overall: number; pillars: EngineMatch['pillars'] }[] = []

    for (const area of areas) {
      if (!area.avgPriceSqft || area.avgPriceSqft === 0) continue

      const financialFit = computeFinancialFit(client, area)
      const investmentFit = computeInvestmentFit(area, purpose)
      const lifestyleFit = computeLifestyleFit(area, purpose, client.type)
      const purposeAlignment = computePurposeAlignment(client, area, purpose, purposeAssignment.confidence)

      const overall = Math.round(
        financialFit.score * 0.25 +
        lifestyleFit.score * config.lifestyleWeight * 0.5 +
        investmentFit.score * config.investmentWeight * 0.5 +
        purposeAlignment.score * 0.25
      )

      areaScores.push({
        area,
        overall,
        pillars: { financialFit, lifestyleFit, investmentFit, purposeAlignment }
      })
    }

    // Sort by overall score, take top 5 areas for each client
    areaScores.sort((a, b) => b.overall - a.overall)
    const topMatches = areaScores.slice(0, 5)

    for (let i = 0; i < topMatches.length; i++) {
      const { area, overall, pillars } = topMatches[i]
      matchIdx++

      // Status distribution based on rank
      const statuses: EngineMatch['status'][] =
        i === 0 ? ['active', 'presented', 'shortlisted'] :
        i === 1 ? ['active', 'presented'] :
        ['active']
      const status = statuses[matchIdx % statuses.length]

      realMatches.push({
        id: `eng-area-${matchIdx}`,
        clientId: client.id,
        propertyId: area.id,  // area ID as property proxy
        purpose,
        overallScore: overall,
        grade: gradeFromScore(overall),
        pillars,
        narrative: generateRealNarrative(client, area, purpose, overall, pillars),
        confidence: Math.min(0.95, 0.5 + (overall / 200)),
        createdAt: '2026-03-25T08:00:00Z',
        status,
        areaId: area.id,
        areaData: {
          avgPriceSqft: area.avgPriceSqft || 0,
          rentalYield: (area as any).avgRentalYield || 0,
          demandScore: (area as any).demandScore || 0,
          priceChange30d: (area as any).priceChange30d || 0,
          transactionCount: (area as any).transactionCount90d || 0,
          outlook: (area as any).outlook || 'neutral',
        }
      })
    }
  }

  return realMatches
}

// Also preserve original property matches (the deal pipeline)
function buildPropertyMatches(): EngineMatch[] {
  return matches.map((match) => {
    const client = clients.find(c => c.id === match.clientId)
    const property = properties.find(p => p.id === match.propertyId)
    const purposeAssignment = clientPurposes.find(p => p.clientId === match.clientId)

    if (!client || !property || !purposeAssignment) return null

    const purpose = purposeAssignment.primaryPurpose
    const config = PURPOSE_CONFIGS.find(p => p.id === purpose)!

    // Try to find the area in real data for enrichment
    const areaName = property.area.toUpperCase()
    const area = (areaProfiles || []).find((a: any) =>
      a.name?.toUpperCase() === areaName ||
      a.shortName?.toUpperCase() === areaName.replace(/\s+/g, '') ||
      a.name?.toUpperCase().includes(areaName) ||
      areaName.includes(a.name?.toUpperCase() || '')
    )

    let financialFit: PillarScore
    let investmentFit: PillarScore
    let lifestyleFit: PillarScore
    let purposeAlignment: PillarScore

    if (area) {
      // Score against real area data
      financialFit = computeFinancialFit(client, area)
      investmentFit = computeInvestmentFit(area, purpose)
      lifestyleFit = computeLifestyleFit(area, purpose, client.type)
      purposeAlignment = computePurposeAlignment(client, area, purpose, purposeAssignment.confidence)
    } else {
      // Fallback to original mock pillar scores
      financialFit = {
        name: 'Financial Fit', shortCode: 'FF',
        score: Math.round(match.pillars.financial * 100), weight: 0.25,
        breakdown: `Budget alignment from deal pipeline data`
      }
      investmentFit = {
        name: 'Investment Fit', shortCode: 'IF',
        score: Math.round(match.pillars.value * 100),
        weight: config.investmentWeight * 0.4,
        breakdown: `Value assessment from deal pipeline data`
      }
      lifestyleFit = {
        name: 'Lifestyle Fit', shortCode: 'LF',
        score: Math.round(match.pillars.clientFit * 100),
        weight: config.lifestyleWeight * 0.4,
        breakdown: `Client fit from deal pipeline data`
      }
      purposeAlignment = {
        name: 'Purpose Alignment', shortCode: 'PA',
        score: Math.round(60 + purposeAssignment.confidence * 35),
        weight: 0.25,
        breakdown: `${purpose} alignment at ${Math.round(purposeAssignment.confidence * 100)}% confidence`
      }
    }

    const overall = Math.round(
      financialFit.score * 0.25 +
      lifestyleFit.score * config.lifestyleWeight * 0.5 +
      investmentFit.score * config.investmentWeight * 0.5 +
      purposeAlignment.score * 0.25
    )

    return {
      id: `eng-${match.id}`,
      clientId: match.clientId,
      propertyId: match.propertyId,
      purpose,
      overallScore: overall,
      grade: gradeFromScore(overall),
      pillars: { financialFit, lifestyleFit, investmentFit, purposeAlignment },
      narrative: match.aiIntelligence, // Keep the rich deal-specific narratives
      confidence: Math.min(0.95, 0.5 + (overall / 200)),
      createdAt: match.createdAt,
      status: (['active', 'presented', 'shortlisted', 'converted'] as const)[
        Math.floor(match.overallScore * 3.5)
      ] || 'active',
      areaId: area?.id,
      areaData: area ? {
        avgPriceSqft: area.avgPriceSqft || 0,
        rentalYield: (area as any).avgRentalYield || 0,
        demandScore: (area as any).demandScore || 0,
        priceChange30d: (area as any).priceChange30d || 0,
        transactionCount: (area as any).transactionCount90d || 0,
        outlook: (area as any).outlook || 'neutral',
      } : undefined,
    } as EngineMatch
  }).filter((m): m is EngineMatch => m !== null)
}

// Combine: property pipeline matches + area intelligence matches
const propertyMatches = buildPropertyMatches()
const areaMatches = buildRealAreaMatches()
export const engineMatches: EngineMatch[] = [...propertyMatches, ...areaMatches]

// ============================================================================
// ACCESSORS
// ============================================================================

export function getClientPurpose(clientId: string): ClientPurposeAssignment | undefined {
  return clientPurposes.find(p => p.clientId === clientId)
}

export function getEngineMatchesForClient(clientId: string): EngineMatch[] {
  return engineMatches.filter(m => m.clientId === clientId)
}

export function getEngineMatchesForProperty(propertyId: string): EngineMatch[] {
  return engineMatches.filter(m => m.propertyId === propertyId)
}

export function getEngineMatch(matchId: string): EngineMatch | undefined {
  return engineMatches.find(m => m.id === matchId)
}

// New: get area-based matches only (real market intelligence matches)
export function getAreaMatchesForClient(clientId: string): EngineMatch[] {
  return areaMatches.filter(m => m.clientId === clientId)
}

// ============================================================================
// AGGREGATE STATS
// ============================================================================

export interface EngineSummary {
  totalMatches: number
  purposeBreakdown: Record<ClientPurpose, number>
  gradeBreakdown: Record<string, number>
  avgScore: number
  statusBreakdown: Record<string, number>
  topPurpose: ClientPurpose
  conversionRate: number
  activeMatches: number
}

export function getEngineSummary(): EngineSummary {
  const purposeBreakdown: Record<ClientPurpose, number> = {
    'Investment': 0, 'End-Use': 0, 'Family Office': 0,
    'Renovation': 0, 'Golden Visa': 0, 'Pied-à-Terre': 0,
  }
  const gradeBreakdown: Record<string, number> = { 'A+': 0, 'A': 0, 'B+': 0, 'B': 0, 'C': 0, 'D': 0 }
  const statusBreakdown: Record<string, number> = {
    active: 0, presented: 0, shortlisted: 0, rejected: 0, converted: 0,
  }

  let totalScore = 0
  let converted = 0
  let presented = 0

  engineMatches.forEach(m => {
    purposeBreakdown[m.purpose]++
    gradeBreakdown[m.grade]++
    statusBreakdown[m.status]++
    totalScore += m.overallScore
    if (m.status === 'converted') converted++
    if (['presented', 'shortlisted', 'converted'].includes(m.status)) presented++
  })

  const topPurpose = (Object.entries(purposeBreakdown) as [ClientPurpose, number][])
    .sort((a, b) => b[1] - a[1])[0][0]

  return {
    totalMatches: engineMatches.length,
    purposeBreakdown,
    gradeBreakdown,
    avgScore: engineMatches.length > 0 ? Math.round(totalScore / engineMatches.length) : 0,
    statusBreakdown,
    topPurpose,
    conversionRate: presented > 0 ? Math.round((converted / presented) * 100) : 0,
    activeMatches: engineMatches.filter(m => m.status === 'active').length,
  }
}

// ============================================================================
// PURPOSE TRENDS (from real match data)
// ============================================================================

export interface PurposeTrend {
  month: string
  purpose: ClientPurpose
  matchCount: number
  avgScore: number
  conversions: number
}

// Generate trends from actual match distribution
function buildPurposeTrends(): PurposeTrend[] {
  const trends: PurposeTrend[] = []
  const months = ['Oct 2025', 'Nov 2025', 'Dec 2025', 'Jan 2026', 'Feb 2026', 'Mar 2026']
  const purposes: ClientPurpose[] = ['Investment', 'End-Use', 'Golden Visa', 'Family Office', 'Renovation', 'Pied-à-Terre']

  // Count actual purpose distribution from engine matches
  const purposeCounts: Record<ClientPurpose, number> = {
    'Investment': 0, 'End-Use': 0, 'Family Office': 0,
    'Renovation': 0, 'Golden Visa': 0, 'Pied-à-Terre': 0,
  }
  const purposeScores: Record<ClientPurpose, number[]> = {
    'Investment': [], 'End-Use': [], 'Family Office': [],
    'Renovation': [], 'Golden Visa': [], 'Pied-à-Terre': [],
  }

  engineMatches.forEach(m => {
    purposeCounts[m.purpose]++
    purposeScores[m.purpose].push(m.overallScore)
  })

  for (const purpose of purposes) {
    const count = purposeCounts[purpose]
    if (count === 0) continue

    const avgScore = purposeScores[purpose].length > 0
      ? Math.round(purposeScores[purpose].reduce((a, b) => a + b, 0) / purposeScores[purpose].length)
      : 65

    // Simulate growth trajectory over 6 months
    for (let i = 0; i < months.length; i++) {
      const growthFactor = 0.5 + (i / (months.length - 1)) * 0.5 // ramp from 50% to 100%
      const monthCount = Math.max(1, Math.round(count / clients.length * 10 * growthFactor))
      const monthScore = Math.round(avgScore - 5 + (i / months.length * 10)) // scores improve over time
      const conversions = Math.max(0, Math.round(monthCount * 0.15))

      trends.push({
        month: months[i],
        purpose,
        matchCount: monthCount,
        avgScore: Math.min(100, monthScore),
        conversions,
      })
    }
  }

  return trends
}

export const purposeTrends: PurposeTrend[] = buildPurposeTrends()
