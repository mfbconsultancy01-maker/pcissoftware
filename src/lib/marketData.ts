// ============================================================================
// PCIS Engine 2 — SCOUT Market Intelligence Data Layer
// ============================================================================
// Now powered by REAL DLD data (Q1 2026) from dubailand.gov.ae open data.
// Mock data kept as fallback. Toggle USE_REAL_AREA_DATA to switch.
// ============================================================================

import { REAL_AREA_PROFILES, REAL_AREA_MAP } from './realMarketData'
import { REAL_PRICE_TIERS, REAL_PRICE_BREAKDOWNS } from './realDerivedData'
import { REAL_AREA_RENTALS, REAL_BUILDING_RENTALS, REAL_AREA_AMENITIES, getRentalProfileByArea } from './realRentalData'
import { REAL_AREA_SUPPLY, REAL_DEVELOPER_PROFILES, REAL_MARKET_SUPPLY_STATS, getSupplyByArea } from './realProjectData'
import { REAL_PROJECT_UNITS, REAL_AREA_BUILDINGS, REAL_MARKET_BUILDING_STATS, getProjectsByArea } from './realBuildingData'

const USE_REAL_AREA_DATA = true
const USE_REAL_RENTAL_DATA = true
const USE_REAL_PROJECT_DATA = true

// ============================================================================
// DLD uses official cadastral district names, not marketing names.
// This map translates PCIS marketing names → DLD AREA_EN values.
// Areas mapping to multiple DLD districts have their data aggregated.
// ============================================================================
const DLD_NAME_MAP: Record<string, string[]> = {
  'JUMEIRAH VILLAGE CIRCLE': ['Al Hebiah First', 'Al Hebiah Second', 'Al Hebiah Fourth', 'Al Hebiah Sixth'],
  'JUMEIRAH VILLAGE TRIANGLE': ['Al Hebiah Third'],
  'DUBAI MARINA': ['Marsa Dubai'],
  'JUMEIRAH LAKES TOWERS': ['Al Thanyah First'],
  'ARJAN': ['Al Barsha South Fourth', 'Al Barsha South Fifth'],
  'AL FURJAN': ['Al Yufrah 1', 'Al Yufrah 2'],
  'DUBAI LAND RESIDENCE COMPLEX': ['Wadi Al Safa 3'],
  'DUBAI HILLS': ['Al Merkadh'],
  'MOTOR CITY': ['Al Goze Industrial First'],
  'SILICON OASIS': ['Al Yelayiss 1', 'Al Yelayiss 2'],
  'INTERNATIONAL CITY PH 1': ['Al Warsan First'],
  'BUSINESS PARK': ['Al Thanyah Third'],
  'TECOM SITE A': ['Al Thanyah Fifth'],
  'DUBAI PRODUCTION CITY': ['Saih Shuaib 1', 'Saih Shuaib 2'],
  'DUBAI SPORTS CITY': ['Wadi Al Safa 7'],
  'MAJAN': ['Wadi Al Safa 6'],
  'DUBAI STUDIO CITY': ['Saih Shuaib 3'],
  'DUBAI SOUTH': ['Jabal Ali Industrial Second'],
  'DUBAI SCIENCE PARK': ['Al Barshaa South First'],
  'DUBAI CREEK HARBOUR': ['Al Jadaf'],
  'DUBAI MARITIME CITY': ['Al Hudaiba'],
}

// Weighted average helper (returns 0 if no data)
function wavg(profiles: any[], key: string): number {
  let totalContracts = 0, weightedSum = 0
  for (const p of profiles) {
    if (p[key] && p.totalContracts) {
      weightedSum += p[key] * p.totalContracts
      totalContracts += p.totalContracts
    }
  }
  return totalContracts > 0 ? Math.round(weightedSum / totalContracts) : 0
}

// Merge multiple DLD rental profiles into one aggregate profile
function mergeRentalProfiles(profiles: any[]): any {
  if (profiles.length === 0) return null
  if (profiles.length === 1) return profiles[0]
  const totalContracts = profiles.reduce((s, p) => s + (p.totalContracts || 0), 0)
  return {
    areaName: profiles[0].areaName,
    totalContracts,
    avgRentStudio: wavg(profiles, 'avgRentStudio'),
    avgRent1Bed: wavg(profiles, 'avgRent1Bed'),
    avgRent2Bed: wavg(profiles, 'avgRent2Bed'),
    avgRent3Bed: wavg(profiles, 'avgRent3Bed'),
    avgRent4PlusBed: wavg(profiles, 'avgRent4PlusBed'),
    avgRentOverall: wavg(profiles, 'avgRentOverall'),
    occupancyRate: +(profiles.reduce((s, p) => s + (p.occupancyRate || 0), 0) / profiles.length).toFixed(1),
    rentChange30d: +(profiles.reduce((s, p) => s + (p.rentChange30d || 0), 0) / profiles.length).toFixed(1),
    freeholdPct: +(profiles.reduce((s, p) => s + (p.freeholdPct || 0), 0) / profiles.length).toFixed(1),
  }
}

// Resolve rental profile: try direct name match first, then DLD name map
function resolveRentalProfile(profileName: string): any {
  // Direct match
  const direct = getRentalProfileByArea(profileName)
  if (direct) return direct
  // Try DLD name aliases
  const aliases = DLD_NAME_MAP[profileName.toUpperCase()] || DLD_NAME_MAP[profileName]
  if (!aliases) return null
  const matched = aliases.map(a => getRentalProfileByArea(a)).filter(Boolean)
  return mergeRentalProfiles(matched)
}

// Resolve supply data: try direct match first, then DLD name map
function resolveSupplyData(profileName: string): any[] {
  const direct = getSupplyByArea(profileName)
  if (direct && direct.projects.length > 0) return direct.projects
  const aliases = DLD_NAME_MAP[profileName.toUpperCase()] || DLD_NAME_MAP[profileName]
  if (!aliases) return []
  const allProjects: any[] = []
  for (const a of aliases) {
    const supply = getSupplyByArea(a)
    if (supply) allProjects.push(...supply.projects)
  }
  return allProjects
}

// Resolve amenities: try direct match, then first DLD alias with data
function resolveAmenities(profileName: string): any {
  const direct = REAL_AREA_AMENITIES[profileName]
  if (direct) return direct
  const aliases = DLD_NAME_MAP[profileName.toUpperCase()] || DLD_NAME_MAP[profileName]
  if (!aliases) return null
  for (const a of aliases) {
    if (REAL_AREA_AMENITIES[a]) return REAL_AREA_AMENITIES[a]
  }
  return null
}

// Inject real price tiers + breakdowns + rental data into area profiles
if (USE_REAL_AREA_DATA) {
  for (const profile of REAL_AREA_PROFILES) {
    const tiers = REAL_PRICE_TIERS[profile.name] || []
    if (tiers.length > 0 && (!profile.priceTiers || profile.priceTiers.length === 0)) {
      (profile as any).priceTiers = tiers
    }
    const breakdowns = REAL_PRICE_BREAKDOWNS[profile.name] || []
    if (breakdowns.length > 0 && (!profile.priceBreakdown || profile.priceBreakdown.length === 0)) {
      (profile as any).priceBreakdown = breakdowns
    }

    // Inject real rental data from 268K DLD rental contracts (with name mapping)
    if (USE_REAL_RENTAL_DATA) {
      const rentalProfile = resolveRentalProfile(profile.name)
      if (rentalProfile) {
        ;(profile as any).rental = {
          avgRentStudio: rentalProfile.avgRentStudio,
          avgRent1Bed: rentalProfile.avgRent1Bed,
          avgRent2Bed: rentalProfile.avgRent2Bed,
          avgRent3Bed: rentalProfile.avgRent3Bed,
          avgRent4PlusBed: rentalProfile.avgRent4PlusBed,
          avgRent: rentalProfile.avgRentOverall,
          avgYield: (profile as any).avgRentalYield || 0,
          rentChange: rentalProfile.rentChange30d,
          occupancyRate: rentalProfile.occupancyRate,
          shortTermRentalPct: 0,
          avgDaysOnMarketRental: 0,
          rentalPriceChange30d: rentalProfile.rentChange30d,
          rentalPriceChangeYoY: 0,
        }
        // Inject amenity data
        const amenities = resolveAmenities(profile.name)
        if (amenities) {
          ;(profile as any).amenities = amenities
        }
      }
    }

    // Inject real supply pipeline from 153 DLD registered projects (with name mapping)
    if (USE_REAL_PROJECT_DATA) {
      const projects = resolveSupplyData(profile.name)
      if (projects.length > 0) {
        ;(profile as any).supplyPipeline = projects.map((p: any) => ({
          name: p.name,
          developer: p.developer,
          totalUnits: p.totalUnits,
          completionDate: p.completionDate || p.endDate,
          percentComplete: p.percentComplete,
          status: p.status,
        }))
      }
    }

    // ========================================================================
    // Enrich with building/unit registration data (3,197 DLD unit records)
    // ========================================================================
    const buildingStats = REAL_AREA_BUILDINGS[profile.name]
    if (buildingStats) {
      ;(profile as any).buildingStats = buildingStats
    }
    const projectUnits = getProjectsByArea(profile.name)
    if (projectUnits.length > 0) {
      ;(profile as any).projectUnitDetails = projectUnits
      // Enrich existing supply pipeline entries with unit mix data
      const pipeline = (profile as any).supplyPipeline || []
      for (const pipelineEntry of pipeline) {
        const unitDetail = projectUnits.find(
          (u: any) => u.name.toLowerCase() === pipelineEntry.name?.toLowerCase()
        )
        if (unitDetail) {
          pipelineEntry.roomMix = unitDetail.roomMix
          pipelineEntry.avgBuiltUpArea = unitDetail.avgBuiltUpArea
          pipelineEntry.parkingRatio = unitDetail.parkingRatio
          pipelineEntry.offplanPct = unitDetail.offplanPct
          pipelineEntry.primaryType = unitDetail.primaryType
        }
      }
    }

    // ========================================================================
    // Enrich liquidity metrics from transaction data
    // ========================================================================
    const liqData = (profile as any).liquidity || {}
    const txns = (profile as any).recentTransactions || []
    const offPlanCount = txns.filter((t: any) => t.isOffPlan).length
    const offPlanPct = txns.length > 0 ? Math.round((offPlanCount / txns.length) * 100) : 0
    // Estimate negotiation margin from price variance (stddev of priceSqft / mean)
    const priceSqftValues = txns.map((t: any) => t.priceSqft).filter((v: number) => v > 0)
    let negotiationMargin = 0
    if (priceSqftValues.length > 2) {
      const mean = priceSqftValues.reduce((a: number, b: number) => a + b, 0) / priceSqftValues.length
      const variance = priceSqftValues.reduce((s: number, v: number) => s + (v - mean) ** 2, 0) / priceSqftValues.length
      negotiationMargin = +((Math.sqrt(variance) / mean) * 100).toFixed(1)
      // Cap at reasonable range (typical Dubai negotiation is 3-15%)
      negotiationMargin = Math.min(Math.max(negotiationMargin, 2), 20)
    }
    ;(profile as any).liquidity = {
      ...liqData,
      avgDaysToSell: liqData.avgDaysToSell || liqData.avgDaysOnMarket || 45,
      liquidityScore: liqData.liquidityScore || Math.round((liqData.absorptionRate || 0.5) * 100),
      negotiationMarginPct: liqData.negotiationMarginPct || negotiationMargin,
      resaleVsOffPlanPct: liqData.resaleVsOffPlanPct || offPlanPct,
    }

    // ========================================================================
    // Generate risk factors from real data signals
    // ========================================================================
    if (!profile.riskFactors || profile.riskFactors.length === 0) {
      const risks: string[] = []
      const p30 = profile.priceChange30d || 0
      const p90 = profile.priceChange90d || 0
      const cashPct = (profile as any).cashPercent || 0
      const rentalInfo = (profile as any).rental

      // Price volatility risk
      if (Math.abs(p30) > 8) risks.push(`High short-term price volatility (${p30 > 0 ? '+' : ''}${p30}% in 30 days)`)
      else if (p30 < -2) risks.push(`Declining prices: ${p30}% over 30 days`)

      // Over-supply risk
      if (offPlanPct > 60) risks.push(`Heavy off-plan concentration (${offPlanPct}% of transactions) — delivery risk`)
      if ((profile as any).supplyPipeline && (profile as any).supplyPipeline.length > 5) {
        const totalUnits = (profile as any).supplyPipeline.reduce((s: number, p2: any) => s + (p2.totalUnits || 0), 0)
        if (totalUnits > 1000) risks.push(`${totalUnits.toLocaleString()} units in pipeline may pressure prices on delivery`)
      }

      // Low cash / high leverage risk
      if (cashPct < 30) risks.push(`Low cash buyer ratio (${cashPct}%) — higher mortgage exposure`)

      // Occupancy / rental risk
      if (rentalInfo?.occupancyRate && rentalInfo.occupancyRate < 50) {
        risks.push(`Low occupancy rate (${rentalInfo.occupancyRate}%) signals oversupply in rental market`)
      }
      if (rentalInfo?.rentChange && rentalInfo.rentChange < -5) {
        risks.push(`Declining rents (${rentalInfo.rentChange}%) — yield compression risk`)
      }

      // Price-to-rent disconnect
      if ((profile as any).avgRentalYield && (profile as any).avgRentalYield < 4.5) {
        risks.push(`Below-market yield (${(profile as any).avgRentalYield}%) — capital appreciation dependent`)
      }

      // High negotiation margin = price uncertainty
      if (negotiationMargin > 12) risks.push(`Wide price dispersion (±${negotiationMargin}%) — valuation uncertainty`)

      // Demand trend
      if ((profile as any).demandTrend === 'falling' && (profile as any).demandChange < -20) {
        risks.push(`Demand declining sharply (${(profile as any).demandChange}% quarter-on-quarter)`)
      }

      // If no risks found, add a positive note
      if (risks.length === 0) risks.push('No significant risk factors identified for this market')

      ;(profile as any).riskFactors = risks
    }
  }
}

// Export real project data for direct use in panels
export { REAL_AREA_SUPPLY, REAL_DEVELOPER_PROFILES, REAL_MARKET_SUPPLY_STATS } from './realProjectData'
export { REAL_PROJECT_UNITS, REAL_AREA_BUILDINGS, REAL_MARKET_BUILDING_STATS } from './realBuildingData'

// ---------------------------------------------------------------------------
// AREA INTELLIGENCE
// ---------------------------------------------------------------------------

export interface AreaProfile {
  id: string
  name: string
  shortName: string           // 3-4 char code for terminal display
  coordinates: { lat: number; lng: number }
  demandScore: number         // 0-100
  demandTrend: 'rising' | 'falling' | 'stable'
  demandChange: number        // percent change vs last quarter
  avgPriceSqft: number        // AED per sqft
  priceChange30d: number      // percent
  priceChange90d: number      // percent
  priceChangeYoY: number      // percent
  avgRentalYield: number      // percent gross
  totalInventory: number      // active listings
  newListings30d: number
  transactionCount90d: number
  avgTransactionValue: number // AED
  topPropertyType: string
  topBuyerNationality: string
  cashPercent: number         // percent cash transactions
  priceHistory: number[]      // 12 months of avg price/sqft
  demandHistory: number[]     // 12 months of demand score
  volumeHistory: number[]     // 12 months of transaction counts
  yieldHistory: number[]      // 12 months of rental yield
  description: string
  keyDrivers: string[]
  riskFactors: string[]
  outlook: 'bullish' | 'bearish' | 'neutral'
  outlookReason: string
  subAreas: string[]
  recentTransactions: AreaTransaction[]
  activeInventory: AreaInventory[]
  priceBreakdown: PriceBreakdown[]
  buyerDemographics: BuyerDemographic[]
  rental: RentalData
  serviceCharges: ServiceChargeData
  supplyPipeline: SupplyPipelineProject[]
  liquidity: MarketLiquidity
  regulatory: RegulatoryInfo
  lifestyle: LifestyleAmenity
  community: CommunityProfile
  priceTiers: PriceTier[]
  seasonalPattern: SeasonalPattern
}

export interface AreaTransaction {
  id: string
  date: string
  propertyType: string
  bedrooms: number
  size: number              // sqft
  price: number             // AED
  priceSqft: number
  building?: string
  isOffPlan: boolean
  buyerNationality: string
  paymentType: 'Cash' | 'Mortgage'
}

export interface AreaInventory {
  propertyType: string
  count: number
  avgPrice: number
  avgPriceSqft: number
  avgSize: number
  priceRange: { min: number; max: number }
}

export interface PriceBreakdown {
  propertyType: string
  avgPriceSqft: number
  change30d: number
  change90d: number
  changeYoY: number
}

export interface BuyerDemographic {
  nationality: string
  percent: number
  avgBudget: number
  preferredType: string
}

export interface RentalData {
  avgRentStudio: number
  avgRent1Bed: number
  avgRent2Bed: number
  avgRent3Bed: number
  avgRent4PlusBed: number
  occupancyRate: number
  shortTermRentalPct: number
  avgDaysOnMarketRental: number
  rentalPriceChange30d: number
  rentalPriceChangeYoY: number
}

export interface ServiceChargeData {
  avgPerSqft: number
  rangeMin: number
  rangeMax: number
  trend: 'increasing' | 'stable' | 'decreasing'
  changeYoY: number
}

export interface SupplyPipelineProject {
  name: string
  developer: string
  totalUnits: number
  propertyType: string
  expectedDelivery: string
  status: 'Under Construction' | 'Launched' | 'Completed' | 'Planned'
  priceRange?: string
}

export interface MarketLiquidity {
  avgDaysToSell: number
  negotiationMarginPct: number
  liquidityScore: number
  resaleVsOffPlanPct: number
}

export interface RegulatoryInfo {
  tenure: 'Freehold' | 'Leasehold' | 'Mixed'
  goldenVisaEligible: boolean
  goldenVisaMinInvestment: number
  foreignOwnership: '100% Freehold' | 'Leasehold Only' | 'Mixed'
  maxMortgageLTV: number
  dldRegistrationFee: number
  agentCommissionPct: number
  oqoodFee?: number
}

export interface LifestyleAmenity {
  topSchools: string[]
  nearestHospital: string
  hospitalDistance: number
  nearestMetro: string
  metroDistance: number
  beachDistance: number
  nearestMall: string
  mallDistance: number
  airportDistance: number
  alMaktoumAirportDistance: number
  walkabilityScore: number
}

export interface CommunityProfile {
  establishedYear: number
  maturityLevel: 'Established' | 'Maturing' | 'Emerging' | 'New'
  occupancyRate: number
  ownerOccupierPct: number
  investorPct: number
  totalUnitsInArea: number
  population: number
}

export interface PriceTier {
  tier: 'Ultra-Luxury' | 'Luxury' | 'Mid-Range' | 'Affordable'
  priceRangeMin: number
  priceRangeMax: number
  avgPriceSqft: number
  pctOfMarket: number
}

export interface SeasonalPattern {
  monthlyVolumeIndex: number[]
  peakMonths: string[]
  slowMonths: string[]
  bestTimeToBuy: string
  bestTimeToSell: string
}

// ---------------------------------------------------------------------------
// AREA DATA — 40 Real Dubai Areas from DLD (Q1 2026) + 11 mock fallback
// ---------------------------------------------------------------------------

const mockAreas: AreaProfile[] = [
  {
    id: 'palm-jumeirah',
    name: 'Palm Jumeirah',
    shortName: 'PLM',
    coordinates: { lat: 25.1124, lng: 55.1390 },
    demandScore: 94,
    demandTrend: 'rising',
    demandChange: 12.3,
    avgPriceSqft: 3850,
    priceChange30d: 2.1,
    priceChange90d: 5.8,
    priceChangeYoY: 18.4,
    avgRentalYield: 5.2,
    totalInventory: 342,
    newListings30d: 28,
    transactionCount90d: 156,
    avgTransactionValue: 45000000,
    topPropertyType: 'Villa',
    topBuyerNationality: 'Indian',
    cashPercent: 72,
    priceHistory: [3200, 3280, 3350, 3400, 3450, 3520, 3580, 3620, 3680, 3720, 3790, 3850],
    demandHistory: [82, 83, 85, 86, 88, 89, 90, 91, 92, 93, 93, 94],
    volumeHistory: [42, 45, 48, 52, 55, 50, 53, 58, 62, 56, 54, 52],
    yieldHistory: [5.8, 5.7, 5.6, 5.5, 5.5, 5.4, 5.4, 5.3, 5.3, 5.2, 5.2, 5.2],
    description: 'The crown jewel of Dubai real estate. Palm Jumeirah continues to command the highest per-sqft prices in the UAE, driven by trophy buyers and ultra-luxury demand. Limited new supply on the crescent and fronds keeps pricing power strong.',
    keyDrivers: ['Trophy buyer demand from UHNW segment', 'Limited new supply on fronds', 'Atlantis The Royal effect on tourism', 'Golden Visa attracting long-term investors', 'Infrastructure upgrades on trunk'],
    riskFactors: ['Price ceiling approaching for apartments', 'Service charge increases on older buildings', 'New ultra-luxury supply in Dubai Islands'],
    outlook: 'bullish',
    outlookReason: 'Trophy villa segment supply-constrained. No new freehold frond villas possible. Demand from Russian, Indian, and European UHNW continues to outpace available inventory.',
    subAreas: ['The Crescent', 'Frond A-P', 'Trunk', 'Shoreline', 'Golden Mile', 'Tiara', 'Palm Tower'],
    recentTransactions: [
      { id: 'at1', date: '2026-03-20', propertyType: 'Villa', bedrooms: 7, size: 14500, price: 185000000, priceSqft: 12759, building: 'Frond N', isOffPlan: false, buyerNationality: 'Emirati', paymentType: 'Cash' },
      { id: 'at2', date: '2026-03-18', propertyType: 'Penthouse', bedrooms: 5, size: 8200, price: 95000000, priceSqft: 11585, building: 'Atlantis The Royal Residences', isOffPlan: false, buyerNationality: 'British', paymentType: 'Cash' },
      { id: 'at3', date: '2026-03-15', propertyType: 'Apartment', bedrooms: 3, size: 2800, price: 12500000, priceSqft: 4464, building: 'Shoreline', isOffPlan: false, buyerNationality: 'Indian', paymentType: 'Mortgage' },
      { id: 'at4', date: '2026-03-14', propertyType: 'Villa', bedrooms: 6, size: 12000, price: 165000000, priceSqft: 13750, building: 'Frond G', isOffPlan: false, buyerNationality: 'Russian', paymentType: 'Cash' },
      { id: 'at5', date: '2026-03-12', propertyType: 'Apartment', bedrooms: 2, size: 1650, price: 7200000, priceSqft: 4364, building: 'Palm Tower', isOffPlan: false, buyerNationality: 'Chinese', paymentType: 'Cash' },
      { id: 'at6', date: '2026-03-10', propertyType: 'Villa', bedrooms: 5, size: 8500, price: 78000000, priceSqft: 9176, building: 'Frond D', isOffPlan: false, buyerNationality: 'Saudi', paymentType: 'Cash' },
    ],
    activeInventory: [
      { propertyType: 'Villa', count: 45, avgPrice: 95000000, avgPriceSqft: 9500, avgSize: 10000, priceRange: { min: 35000000, max: 250000000 } },
      { propertyType: 'Penthouse', count: 18, avgPrice: 55000000, avgPriceSqft: 7800, avgSize: 7000, priceRange: { min: 18000000, max: 150000000 } },
      { propertyType: 'Apartment', count: 279, avgPrice: 8500000, avgPriceSqft: 3200, avgSize: 2650, priceRange: { min: 2800000, max: 25000000 } },
    ],
    priceBreakdown: [
      { propertyType: 'Villa', avgPriceSqft: 9500, change30d: 3.2, change90d: 8.1, changeYoY: 22.5 },
      { propertyType: 'Penthouse', avgPriceSqft: 7800, change30d: 1.8, change90d: 5.2, changeYoY: 16.3 },
      { propertyType: 'Apartment', avgPriceSqft: 3200, change30d: 1.2, change90d: 3.8, changeYoY: 14.1 },
    ],
    buyerDemographics: [
      { nationality: 'Indian', percent: 28, avgBudget: 15000000, preferredType: 'Apartment' },
      { nationality: 'British', percent: 18, avgBudget: 35000000, preferredType: 'Villa' },
      { nationality: 'Russian', percent: 15, avgBudget: 65000000, preferredType: 'Villa' },
      { nationality: 'Emirati', percent: 12, avgBudget: 85000000, preferredType: 'Villa' },
      { nationality: 'Chinese', percent: 8, avgBudget: 12000000, preferredType: 'Apartment' },
    ],
    rental: {
      avgRentStudio: 65000,
      avgRent1Bed: 95000,
      avgRent2Bed: 160000,
      avgRent3Bed: 280000,
      avgRent4PlusBed: 550000,
      occupancyRate: 92,
      shortTermRentalPct: 28,
      avgDaysOnMarketRental: 12,
      rentalPriceChange30d: 1.5,
      rentalPriceChangeYoY: 14.2,
    },
    serviceCharges: {
      avgPerSqft: 25,
      rangeMin: 18,
      rangeMax: 40,
      trend: 'increasing',
      changeYoY: 8.2,
    },
    supplyPipeline: [
      {
        name: 'Palm Jebel Ali',
        developer: 'Nakheel',
        totalUnits: 4000,
        propertyType: 'Mixed',
        expectedDelivery: '2027-2029',
        status: 'Under Construction',
      },
    ],
    liquidity: {
      avgDaysToSell: 45,
      negotiationMarginPct: 5.2,
      liquidityScore: 62,
      resaleVsOffPlanPct: 82,
    },
    regulatory: {
      tenure: 'Freehold',
      goldenVisaEligible: true,
      goldenVisaMinInvestment: 2000000,
      foreignOwnership: '100% Freehold',
      maxMortgageLTV: 75,
      dldRegistrationFee: 4,
      agentCommissionPct: 2,
      oqoodFee: 4,
    },
    lifestyle: {
      topSchools: ['GEMS Wellington Intl', 'Jumeirah English Speaking'],
      nearestHospital: 'Mediclinic',
      hospitalDistance: 3.2,
      nearestMetro: 'Palm Jumeirah Monorail',
      metroDistance: 0.5,
      beachDistance: 0,
      nearestMall: 'Nakheel Mall',
      mallDistance: 0.3,
      airportDistance: 28,
      alMaktoumAirportDistance: 52,
      walkabilityScore: 55,
    },
    community: {
      establishedYear: 2006,
      maturityLevel: 'Established',
      occupancyRate: 92,
      ownerOccupierPct: 55,
      investorPct: 45,
      totalUnitsInArea: 7500,
      population: 25000,
    },
    priceTiers: [
      {
        tier: 'Ultra-Luxury',
        priceRangeMin: 50000000,
        priceRangeMax: 250000000,
        avgPriceSqft: 10000,
        pctOfMarket: 8,
      },
      {
        tier: 'Luxury',
        priceRangeMin: 10000000,
        priceRangeMax: 50000000,
        avgPriceSqft: 4500,
        pctOfMarket: 32,
      },
      {
        tier: 'Mid-Range',
        priceRangeMin: 2500000,
        priceRangeMax: 10000000,
        avgPriceSqft: 3000,
        pctOfMarket: 60,
      },
    ],
    seasonalPattern: {
      monthlyVolumeIndex: [85, 75, 70, 65, 60, 55, 65, 80, 100, 120, 130, 115],
      peakMonths: ['October', 'November', 'December', 'January'],
      slowMonths: ['June', 'July', 'August'],
      bestTimeToBuy: 'Jun-Aug',
      bestTimeToSell: 'Oct-Jan',
    },
  },
  {
    id: 'dubai-marina',
    name: 'Dubai Marina',
    shortName: 'MRN',
    coordinates: { lat: 25.0805, lng: 55.1403 },
    demandScore: 88,
    demandTrend: 'rising',
    demandChange: 8.5,
    avgPriceSqft: 2150,
    priceChange30d: 1.4,
    priceChange90d: 4.2,
    priceChangeYoY: 14.8,
    avgRentalYield: 6.1,
    totalInventory: 1240,
    newListings30d: 95,
    transactionCount90d: 420,
    avgTransactionValue: 5200000,
    topPropertyType: 'Apartment',
    topBuyerNationality: 'Indian',
    cashPercent: 58,
    priceHistory: [1850, 1880, 1900, 1930, 1960, 1990, 2010, 2040, 2070, 2100, 2130, 2150],
    demandHistory: [78, 79, 80, 81, 83, 84, 85, 86, 87, 87, 88, 88],
    volumeHistory: [120, 125, 130, 142, 148, 135, 140, 152, 158, 145, 142, 140],
    yieldHistory: [6.5, 6.4, 6.4, 6.3, 6.3, 6.2, 6.2, 6.2, 6.1, 6.1, 6.1, 6.1],
    description: 'Dubai Marina remains the highest-liquidity residential market in Dubai. Strong rental demand from professionals and the walk-to-work crowd drives consistent yields. The waterfront lifestyle and JBR beach access make it perennially attractive.',
    keyDrivers: ['Highest rental demand in Dubai', 'Walk-to-JBR-beach lifestyle', 'Metro connectivity', 'Professional expat demand', 'Branded residences pipeline'],
    riskFactors: ['Aging building stock in older towers', 'Parking congestion', 'Competition from JLT for budget-conscious renters'],
    outlook: 'bullish',
    outlookReason: 'Rental yields remain among the highest in prime Dubai. New branded residences adding quality supply. Strong end-user demand from working professionals.',
    subAreas: ['Marina Walk', 'JBR', 'Marina Gate', 'Emaar 6 Towers', 'Marina Promenade', 'The Address'],
    recentTransactions: [
      { id: 'mt1', date: '2026-03-21', propertyType: 'Penthouse', bedrooms: 4, size: 5500, price: 52000000, priceSqft: 9455, building: 'Marina Gate 1', isOffPlan: false, buyerNationality: 'British', paymentType: 'Cash' },
      { id: 'mt2', date: '2026-03-19', propertyType: 'Apartment', bedrooms: 2, size: 1350, price: 3200000, priceSqft: 2370, building: 'Princess Tower', isOffPlan: false, buyerNationality: 'Indian', paymentType: 'Mortgage' },
      { id: 'mt3', date: '2026-03-17', propertyType: 'Apartment', bedrooms: 3, size: 2100, price: 5800000, priceSqft: 2762, building: 'The Address Marina', isOffPlan: false, buyerNationality: 'Chinese', paymentType: 'Cash' },
      { id: 'mt4', date: '2026-03-15', propertyType: 'Apartment', bedrooms: 1, size: 850, price: 1950000, priceSqft: 2294, building: 'Damac Heights', isOffPlan: false, buyerNationality: 'Pakistani', paymentType: 'Mortgage' },
      { id: 'mt5', date: '2026-03-13', propertyType: 'Apartment', bedrooms: 2, size: 1500, price: 4100000, priceSqft: 2733, building: 'Marina Promenade', isOffPlan: false, buyerNationality: 'Russian', paymentType: 'Cash' },
    ],
    activeInventory: [
      { propertyType: 'Penthouse', count: 12, avgPrice: 28000000, avgPriceSqft: 5100, avgSize: 5500, priceRange: { min: 12000000, max: 65000000 } },
      { propertyType: 'Apartment', count: 1228, avgPrice: 4200000, avgPriceSqft: 2150, avgSize: 1950, priceRange: { min: 1200000, max: 15000000 } },
    ],
    priceBreakdown: [
      { propertyType: 'Penthouse', avgPriceSqft: 5100, change30d: 2.1, change90d: 6.5, changeYoY: 18.2 },
      { propertyType: 'Apartment', avgPriceSqft: 2150, change30d: 1.4, change90d: 4.2, changeYoY: 14.8 },
    ],
    buyerDemographics: [
      { nationality: 'Indian', percent: 32, avgBudget: 4500000, preferredType: 'Apartment' },
      { nationality: 'British', percent: 15, avgBudget: 8000000, preferredType: 'Apartment' },
      { nationality: 'Pakistani', percent: 12, avgBudget: 3200000, preferredType: 'Apartment' },
      { nationality: 'Russian', percent: 10, avgBudget: 6500000, preferredType: 'Apartment' },
      { nationality: 'Chinese', percent: 8, avgBudget: 5500000, preferredType: 'Apartment' },
    ],
    rental: {
      avgRentStudio: 55000,
      avgRent1Bed: 85000,
      avgRent2Bed: 130000,
      avgRent3Bed: 200000,
      avgRent4PlusBed: 350000,
      occupancyRate: 95,
      shortTermRentalPct: 22,
      avgDaysOnMarketRental: 8,
      rentalPriceChange30d: 1.2,
      rentalPriceChangeYoY: 12.5,
    },
    serviceCharges: {
      avgPerSqft: 18,
      rangeMin: 14,
      rangeMax: 28,
      trend: 'increasing',
      changeYoY: 5.5,
    },
    supplyPipeline: [
      {
        name: 'LIV Marina',
        developer: 'LIV Developers',
        totalUnits: 400,
        propertyType: 'Apartment',
        expectedDelivery: 'Q4 2026',
        status: 'Under Construction',
      },
      {
        name: 'Marina Shores',
        developer: 'Emaar',
        totalUnits: 530,
        propertyType: 'Apartment',
        expectedDelivery: 'Q2 2027',
        status: 'Under Construction',
      },
    ],
    liquidity: {
      avgDaysToSell: 22,
      negotiationMarginPct: 3.8,
      liquidityScore: 88,
      resaleVsOffPlanPct: 90,
    },
    regulatory: {
      tenure: 'Freehold',
      goldenVisaEligible: true,
      goldenVisaMinInvestment: 2000000,
      foreignOwnership: '100% Freehold',
      maxMortgageLTV: 80,
      dldRegistrationFee: 4,
      agentCommissionPct: 2,
      oqoodFee: 4,
    },
    lifestyle: {
      topSchools: ['GEMS First Point', 'Dubai International Academy'],
      nearestHospital: 'Mediclinic Marina',
      hospitalDistance: 0.8,
      nearestMetro: 'DMCC',
      metroDistance: 0.4,
      beachDistance: 0.5,
      nearestMall: 'Marina Mall',
      mallDistance: 0.2,
      airportDistance: 32,
      alMaktoumAirportDistance: 48,
      walkabilityScore: 82,
    },
    community: {
      establishedYear: 2003,
      maturityLevel: 'Established',
      occupancyRate: 95,
      ownerOccupierPct: 35,
      investorPct: 65,
      totalUnitsInArea: 38000,
      population: 85000,
    },
    priceTiers: [
      {
        tier: 'Luxury',
        priceRangeMin: 12000000,
        priceRangeMax: 65000000,
        avgPriceSqft: 5100,
        pctOfMarket: 5,
      },
      {
        tier: 'Mid-Range',
        priceRangeMin: 2000000,
        priceRangeMax: 12000000,
        avgPriceSqft: 2500,
        pctOfMarket: 70,
      },
      {
        tier: 'Affordable',
        priceRangeMin: 1200000,
        priceRangeMax: 2000000,
        avgPriceSqft: 1800,
        pctOfMarket: 25,
      },
    ],
    seasonalPattern: {
      monthlyVolumeIndex: [90, 80, 75, 70, 65, 60, 70, 85, 105, 125, 130, 120],
      peakMonths: ['October', 'November', 'December'],
      slowMonths: ['June', 'July', 'August'],
      bestTimeToBuy: 'Jun-Aug',
      bestTimeToSell: 'Oct-Dec',
    },
  },
  {
    id: 'downtown-dubai',
    name: 'Downtown Dubai',
    shortName: 'DTN',
    coordinates: { lat: 25.1972, lng: 55.2744 },
    demandScore: 91,
    demandTrend: 'stable',
    demandChange: 3.2,
    avgPriceSqft: 2800,
    priceChange30d: 0.8,
    priceChange90d: 3.1,
    priceChangeYoY: 12.6,
    avgRentalYield: 5.4,
    totalInventory: 680,
    newListings30d: 52,
    transactionCount90d: 285,
    avgTransactionValue: 8500000,
    topPropertyType: 'Apartment',
    topBuyerNationality: 'Indian',
    cashPercent: 65,
    priceHistory: [2480, 2510, 2540, 2570, 2600, 2630, 2660, 2690, 2720, 2750, 2780, 2800],
    demandHistory: [88, 88, 89, 89, 90, 90, 90, 91, 91, 91, 91, 91],
    volumeHistory: [85, 88, 92, 95, 98, 90, 94, 100, 105, 98, 96, 95],
    yieldHistory: [5.8, 5.7, 5.7, 5.6, 5.6, 5.5, 5.5, 5.5, 5.4, 5.4, 5.4, 5.4],
    description: 'The iconic Burj Khalifa district. Downtown Dubai is the address of choice for corporate executives and lifestyle buyers seeking prestige. Emaar-dominated supply ensures quality control but limits rental yield upside.',
    keyDrivers: ['Burj Khalifa prestige factor', 'Dubai Mall footfall', 'Opera District lifestyle', 'Corporate relocations', 'Emaar brand premium'],
    riskFactors: ['High service charges in Emaar towers', 'Limited parking vs demand', 'Newer districts competing for corporate tenants'],
    outlook: 'neutral',
    outlookReason: 'Mature market with stable demand. Price growth moderating as inventory increases. Yields compressing but remain attractive vs global alternatives.',
    subAreas: ['Burj Khalifa District', 'Opera District', 'The Address Boulevard', 'BLVD Heights', 'Act One Act Two', 'Fountain Views'],
    recentTransactions: [
      { id: 'dt1', date: '2026-03-20', propertyType: 'Penthouse', bedrooms: 5, size: 7200, price: 68000000, priceSqft: 9444, building: 'Burj Khalifa', isOffPlan: false, buyerNationality: 'Emirati', paymentType: 'Cash' },
      { id: 'dt2', date: '2026-03-18', propertyType: 'Apartment', bedrooms: 3, size: 2400, price: 7800000, priceSqft: 3250, building: 'Act One Act Two', isOffPlan: false, buyerNationality: 'Indian', paymentType: 'Mortgage' },
      { id: 'dt3', date: '2026-03-16', propertyType: 'Apartment', bedrooms: 2, size: 1500, price: 4500000, priceSqft: 3000, building: 'The Address Downtown', isOffPlan: false, buyerNationality: 'British', paymentType: 'Cash' },
      { id: 'dt4', date: '2026-03-14', propertyType: 'Apartment', bedrooms: 1, size: 900, price: 2800000, priceSqft: 3111, building: 'Fountain Views', isOffPlan: false, buyerNationality: 'French', paymentType: 'Cash' },
    ],
    activeInventory: [
      { propertyType: 'Penthouse', count: 8, avgPrice: 42000000, avgPriceSqft: 6200, avgSize: 6800, priceRange: { min: 18000000, max: 120000000 } },
      { propertyType: 'Apartment', count: 672, avgPrice: 6500000, avgPriceSqft: 2800, avgSize: 2320, priceRange: { min: 1800000, max: 22000000 } },
    ],
    priceBreakdown: [
      { propertyType: 'Penthouse', avgPriceSqft: 6200, change30d: 1.5, change90d: 4.8, changeYoY: 15.2 },
      { propertyType: 'Apartment', avgPriceSqft: 2800, change30d: 0.8, change90d: 3.1, changeYoY: 12.6 },
    ],
    buyerDemographics: [
      { nationality: 'Indian', percent: 25, avgBudget: 7000000, preferredType: 'Apartment' },
      { nationality: 'Emirati', percent: 15, avgBudget: 22000000, preferredType: 'Penthouse' },
      { nationality: 'British', percent: 14, avgBudget: 9000000, preferredType: 'Apartment' },
      { nationality: 'French', percent: 8, avgBudget: 6000000, preferredType: 'Apartment' },
      { nationality: 'Saudi', percent: 7, avgBudget: 15000000, preferredType: 'Apartment' },
    ],
    rental: {
      avgRentStudio: 60000,
      avgRent1Bed: 90000,
      avgRent2Bed: 150000,
      avgRent3Bed: 240000,
      avgRent4PlusBed: 450000,
      occupancyRate: 93,
      shortTermRentalPct: 18,
      avgDaysOnMarketRental: 10,
      rentalPriceChange30d: 0.8,
      rentalPriceChangeYoY: 10.8,
    },
    serviceCharges: {
      avgPerSqft: 22,
      rangeMin: 16,
      rangeMax: 35,
      trend: 'increasing',
      changeYoY: 6.8,
    },
    supplyPipeline: [
      {
        name: 'Downtown Views II',
        developer: 'Emaar',
        totalUnits: 700,
        propertyType: 'Apartment',
        expectedDelivery: 'Q3 2027',
        status: 'Under Construction',
      },
      {
        name: 'The St. Regis',
        developer: 'Emaar',
        totalUnits: 280,
        propertyType: 'Apartment',
        expectedDelivery: '2028',
        status: 'Launched',
      },
    ],
    liquidity: {
      avgDaysToSell: 28,
      negotiationMarginPct: 4.2,
      liquidityScore: 78,
      resaleVsOffPlanPct: 85,
    },
    regulatory: {
      tenure: 'Freehold',
      goldenVisaEligible: true,
      goldenVisaMinInvestment: 2000000,
      foreignOwnership: '100% Freehold',
      maxMortgageLTV: 75,
      dldRegistrationFee: 4,
      agentCommissionPct: 2,
      oqoodFee: 4,
    },
    lifestyle: {
      topSchools: ['GEMS Wellington Primary', 'Kings School Al Barsha'],
      nearestHospital: 'Mediclinic City Hospital',
      hospitalDistance: 3.5,
      nearestMetro: 'Burj Khalifa/Dubai Mall',
      metroDistance: 0.3,
      beachDistance: 12,
      nearestMall: 'Dubai Mall',
      mallDistance: 0.1,
      airportDistance: 15,
      alMaktoumAirportDistance: 52,
      walkabilityScore: 75,
    },
    community: {
      establishedYear: 2004,
      maturityLevel: 'Established',
      occupancyRate: 93,
      ownerOccupierPct: 40,
      investorPct: 60,
      totalUnitsInArea: 25000,
      population: 55000,
    },
    priceTiers: [
      {
        tier: 'Ultra-Luxury',
        priceRangeMin: 20000000,
        priceRangeMax: 120000000,
        avgPriceSqft: 6200,
        pctOfMarket: 5,
      },
      {
        tier: 'Luxury',
        priceRangeMin: 6000000,
        priceRangeMax: 20000000,
        avgPriceSqft: 3500,
        pctOfMarket: 35,
      },
      {
        tier: 'Mid-Range',
        priceRangeMin: 1800000,
        priceRangeMax: 6000000,
        avgPriceSqft: 2500,
        pctOfMarket: 60,
      },
    ],
    seasonalPattern: {
      monthlyVolumeIndex: [95, 85, 80, 70, 65, 60, 72, 88, 108, 125, 128, 118],
      peakMonths: ['October', 'November', 'December', 'January'],
      slowMonths: ['June', 'July', 'August'],
      bestTimeToBuy: 'Jun-Aug',
      bestTimeToSell: 'Oct-Jan',
    },
  },
  {
    id: 'emirates-hills',
    name: 'Emirates Hills',
    shortName: 'EHL',
    coordinates: { lat: 25.0690, lng: 55.1544 },
    demandScore: 78,
    demandTrend: 'rising',
    demandChange: 6.8,
    avgPriceSqft: 4200,
    priceChange30d: 1.8,
    priceChange90d: 5.5,
    priceChangeYoY: 20.1,
    avgRentalYield: 3.8,
    totalInventory: 42,
    newListings30d: 3,
    transactionCount90d: 18,
    avgTransactionValue: 85000000,
    topPropertyType: 'Villa',
    topBuyerNationality: 'Emirati',
    cashPercent: 92,
    priceHistory: [3400, 3450, 3520, 3580, 3650, 3720, 3780, 3850, 3920, 4000, 4100, 4200],
    demandHistory: [70, 71, 72, 72, 73, 74, 74, 75, 76, 77, 78, 78],
    volumeHistory: [5, 4, 6, 7, 5, 6, 4, 7, 8, 6, 5, 6],
    yieldHistory: [4.0, 4.0, 3.9, 3.9, 3.9, 3.8, 3.8, 3.8, 3.8, 3.8, 3.8, 3.8],
    description: 'The Beverly Hills of Dubai. Gated community of ultra-luxury villas on golf course frontage. Extremely limited supply — only 600+ plots ever built. Pure trophy market with the lowest transaction volumes but highest values in the city.',
    keyDrivers: ['Finite supply — no new plots possible', 'Golf course frontage premium', 'Gated community security', 'Family compound culture', 'Generational wealth storage'],
    riskFactors: ['Very low liquidity', 'Aging villa stock requires renovation', 'Dubai Hills Estate competing for family buyers'],
    outlook: 'bullish',
    outlookReason: 'Zero new supply possible. Existing villas being renovated and expanded. Trophy buyers paying premiums for the address. Land value alone exceeds AED 140M on prime plots.',
    subAreas: ['Sector E', 'Sector P', 'Sector V', 'Sector W', 'Sector R'],
    recentTransactions: [
      { id: 'eh1', date: '2026-03-15', propertyType: 'Villa', bedrooms: 9, size: 22000, price: 220000000, priceSqft: 10000, building: 'Sector E', isOffPlan: false, buyerNationality: 'Emirati', paymentType: 'Cash' },
      { id: 'eh2', date: '2026-03-08', propertyType: 'Villa', bedrooms: 7, size: 15000, price: 145000000, priceSqft: 9667, building: 'Sector P', isOffPlan: false, buyerNationality: 'Saudi', paymentType: 'Cash' },
      { id: 'eh3', date: '2026-02-28', propertyType: 'Villa', bedrooms: 8, size: 18000, price: 178000000, priceSqft: 9889, building: 'Sector V', isOffPlan: false, buyerNationality: 'Indian', paymentType: 'Cash' },
    ],
    activeInventory: [
      { propertyType: 'Villa', count: 42, avgPrice: 85000000, avgPriceSqft: 4200, avgSize: 20000, priceRange: { min: 35000000, max: 280000000 } },
    ],
    priceBreakdown: [
      { propertyType: 'Villa', avgPriceSqft: 4200, change30d: 1.8, change90d: 5.5, changeYoY: 20.1 },
    ],
    buyerDemographics: [
      { nationality: 'Emirati', percent: 35, avgBudget: 120000000, preferredType: 'Villa' },
      { nationality: 'Saudi', percent: 20, avgBudget: 95000000, preferredType: 'Villa' },
      { nationality: 'Indian', percent: 18, avgBudget: 85000000, preferredType: 'Villa' },
      { nationality: 'British', percent: 10, avgBudget: 65000000, preferredType: 'Villa' },
    ],
    rental: {
      avgRentStudio: 0,
      avgRent1Bed: 0,
      avgRent2Bed: 0,
      avgRent3Bed: 0,
      avgRent4PlusBed: 1200000,
      occupancyRate: 85,
      shortTermRentalPct: 2,
      avgDaysOnMarketRental: 45,
      rentalPriceChange30d: 0.5,
      rentalPriceChangeYoY: 8.5,
    },
    serviceCharges: {
      avgPerSqft: 8,
      rangeMin: 5,
      rangeMax: 12,
      trend: 'stable',
      changeYoY: 2.1,
    },
    supplyPipeline: [],
    liquidity: {
      avgDaysToSell: 120,
      negotiationMarginPct: 7.5,
      liquidityScore: 22,
      resaleVsOffPlanPct: 100,
    },
    regulatory: {
      tenure: 'Freehold',
      goldenVisaEligible: true,
      goldenVisaMinInvestment: 2000000,
      foreignOwnership: '100% Freehold',
      maxMortgageLTV: 65,
      dldRegistrationFee: 4,
      agentCommissionPct: 2,
    },
    lifestyle: {
      topSchools: ['Emirates International School', 'Dubai British School'],
      nearestHospital: 'Saudi German Hospital',
      hospitalDistance: 2.5,
      nearestMetro: 'Mall of the Emirates',
      metroDistance: 5.0,
      beachDistance: 8,
      nearestMall: 'Mall of the Emirates',
      mallDistance: 3.5,
      airportDistance: 32,
      alMaktoumAirportDistance: 42,
      walkabilityScore: 15,
    },
    community: {
      establishedYear: 2003,
      maturityLevel: 'Established',
      occupancyRate: 85,
      ownerOccupierPct: 75,
      investorPct: 25,
      totalUnitsInArea: 600,
      population: 2500,
    },
    priceTiers: [
      {
        tier: 'Ultra-Luxury',
        priceRangeMin: 100000000,
        priceRangeMax: 280000000,
        avgPriceSqft: 10000,
        pctOfMarket: 35,
      },
      {
        tier: 'Luxury',
        priceRangeMin: 35000000,
        priceRangeMax: 100000000,
        avgPriceSqft: 4500,
        pctOfMarket: 65,
      },
    ],
    seasonalPattern: {
      monthlyVolumeIndex: [80, 70, 65, 60, 55, 50, 60, 75, 110, 140, 145, 125],
      peakMonths: ['October', 'November', 'December'],
      slowMonths: ['June', 'July', 'August'],
      bestTimeToBuy: 'Jul-Aug',
      bestTimeToSell: 'Oct-Dec',
    },
  },
  {
    id: 'business-bay',
    name: 'Business Bay',
    shortName: 'BBY',
    coordinates: { lat: 25.1860, lng: 55.2614 },
    demandScore: 82,
    demandTrend: 'rising',
    demandChange: 9.4,
    avgPriceSqft: 1850,
    priceChange30d: 1.6,
    priceChange90d: 4.8,
    priceChangeYoY: 16.2,
    avgRentalYield: 6.8,
    totalInventory: 1680,
    newListings30d: 142,
    transactionCount90d: 520,
    avgTransactionValue: 3200000,
    topPropertyType: 'Apartment',
    topBuyerNationality: 'Indian',
    cashPercent: 52,
    priceHistory: [1580, 1600, 1630, 1660, 1690, 1710, 1730, 1760, 1790, 1810, 1830, 1850],
    demandHistory: [72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 81, 82],
    volumeHistory: [150, 158, 165, 172, 180, 168, 175, 185, 192, 178, 175, 173],
    yieldHistory: [7.2, 7.1, 7.1, 7.0, 7.0, 6.9, 6.9, 6.9, 6.8, 6.8, 6.8, 6.8],
    description: 'The value play adjacent to Downtown. Business Bay offers near-Downtown addresses at 35% lower price points. Highest transaction volumes in Dubai. The canal waterfront is emerging as a premium sub-micro-market.',
    keyDrivers: ['Downtown spillover demand', 'Canal waterfront premium', 'Highest rental yields in prime Dubai', 'New branded residences', 'DIFC walkability'],
    riskFactors: ['Oversupply risk in lower-quality towers', 'Construction noise from ongoing projects', 'Traffic congestion'],
    outlook: 'bullish',
    outlookReason: 'Best yield-to-price ratio in prime Dubai. Canal waterfront repositioning the area upmarket. Corporate demand from DIFC expansion.',
    subAreas: ['Canal Front', 'Marasi Drive', 'Bay Square', 'Executive Towers', 'Ubora', 'The Opus'],
    recentTransactions: [
      { id: 'bb1', date: '2026-03-21', propertyType: 'Apartment', bedrooms: 2, size: 1200, price: 2800000, priceSqft: 2333, building: 'Damac Maison Canal Views', isOffPlan: false, buyerNationality: 'Indian', paymentType: 'Mortgage' },
      { id: 'bb2', date: '2026-03-19', propertyType: 'Apartment', bedrooms: 3, size: 1800, price: 4200000, priceSqft: 2333, building: 'The Opus by Zaha Hadid', isOffPlan: false, buyerNationality: 'British', paymentType: 'Cash' },
      { id: 'bb3', date: '2026-03-17', propertyType: 'Apartment', bedrooms: 1, size: 750, price: 1450000, priceSqft: 1933, building: 'Bay Square', isOffPlan: false, buyerNationality: 'Pakistani', paymentType: 'Mortgage' },
    ],
    activeInventory: [
      { propertyType: 'Apartment', count: 1680, avgPrice: 3200000, avgPriceSqft: 1850, avgSize: 1730, priceRange: { min: 850000, max: 18000000 } },
    ],
    priceBreakdown: [
      { propertyType: 'Apartment', avgPriceSqft: 1850, change30d: 1.6, change90d: 4.8, changeYoY: 16.2 },
    ],
    buyerDemographics: [
      { nationality: 'Indian', percent: 35, avgBudget: 3000000, preferredType: 'Apartment' },
      { nationality: 'Pakistani', percent: 15, avgBudget: 2200000, preferredType: 'Apartment' },
      { nationality: 'British', percent: 12, avgBudget: 5000000, preferredType: 'Apartment' },
      { nationality: 'Chinese', percent: 8, avgBudget: 3500000, preferredType: 'Apartment' },
    ],
    rental: {
      avgRentStudio: 42000,
      avgRent1Bed: 65000,
      avgRent2Bed: 100000,
      avgRent3Bed: 160000,
      avgRent4PlusBed: 280000,
      occupancyRate: 94,
      shortTermRentalPct: 15,
      avgDaysOnMarketRental: 7,
      rentalPriceChange30d: 1.8,
      rentalPriceChangeYoY: 15.2,
    },
    serviceCharges: {
      avgPerSqft: 15,
      rangeMin: 10,
      rangeMax: 22,
      trend: 'increasing',
      changeYoY: 6.2,
    },
    supplyPipeline: [
      {
        name: 'Binghatti Ghost',
        developer: 'Binghatti',
        totalUnits: 450,
        propertyType: 'Apartment',
        expectedDelivery: 'Q1 2027',
        status: 'Under Construction',
      },
      {
        name: 'Peninsula by Select Group',
        developer: 'Select Group',
        totalUnits: 600,
        propertyType: 'Apartment',
        expectedDelivery: 'Q4 2027',
        status: 'Under Construction',
      },
      {
        name: 'Bugatti Residences',
        developer: 'Binghatti',
        totalUnits: 182,
        propertyType: 'Apartment',
        expectedDelivery: '2026',
        status: 'Under Construction',
      },
    ],
    liquidity: {
      avgDaysToSell: 18,
      negotiationMarginPct: 3.5,
      liquidityScore: 92,
      resaleVsOffPlanPct: 75,
    },
    regulatory: {
      tenure: 'Freehold',
      goldenVisaEligible: true,
      goldenVisaMinInvestment: 2000000,
      foreignOwnership: '100% Freehold',
      maxMortgageLTV: 80,
      dldRegistrationFee: 4,
      agentCommissionPct: 2,
      oqoodFee: 4,
    },
    lifestyle: {
      topSchools: ['JSS International School', 'GEMS Metropole'],
      nearestHospital: 'Mediclinic Parkview',
      hospitalDistance: 2.8,
      nearestMetro: 'Business Bay',
      metroDistance: 0.3,
      beachDistance: 12,
      nearestMall: 'Bay Avenue',
      mallDistance: 0.2,
      airportDistance: 14,
      alMaktoumAirportDistance: 52,
      walkabilityScore: 72,
    },
    community: {
      establishedYear: 2005,
      maturityLevel: 'Maturing',
      occupancyRate: 94,
      ownerOccupierPct: 28,
      investorPct: 72,
      totalUnitsInArea: 45000,
      population: 95000,
    },
    priceTiers: [
      {
        tier: 'Luxury',
        priceRangeMin: 8000000,
        priceRangeMax: 18000000,
        avgPriceSqft: 3500,
        pctOfMarket: 10,
      },
      {
        tier: 'Mid-Range',
        priceRangeMin: 1500000,
        priceRangeMax: 8000000,
        avgPriceSqft: 2000,
        pctOfMarket: 65,
      },
      {
        tier: 'Affordable',
        priceRangeMin: 850000,
        priceRangeMax: 1500000,
        avgPriceSqft: 1500,
        pctOfMarket: 25,
      },
    ],
    seasonalPattern: {
      monthlyVolumeIndex: [92, 82, 78, 72, 68, 62, 72, 88, 108, 122, 128, 118],
      peakMonths: ['October', 'November', 'December'],
      slowMonths: ['June', 'July', 'August'],
      bestTimeToBuy: 'Jun-Aug',
      bestTimeToSell: 'Oct-Dec',
    },
  },
  {
    id: 'dubai-hills',
    name: 'Dubai Hills Estate',
    shortName: 'DHL',
    coordinates: { lat: 25.1266, lng: 55.2434 },
    demandScore: 86,
    demandTrend: 'rising',
    demandChange: 11.2,
    avgPriceSqft: 2450,
    priceChange30d: 2.2,
    priceChange90d: 6.1,
    priceChangeYoY: 19.5,
    avgRentalYield: 5.0,
    totalInventory: 520,
    newListings30d: 45,
    transactionCount90d: 280,
    avgTransactionValue: 12000000,
    topPropertyType: 'Villa',
    topBuyerNationality: 'Indian',
    cashPercent: 64,
    priceHistory: [2020, 2050, 2080, 2120, 2160, 2200, 2240, 2280, 2320, 2370, 2410, 2450],
    demandHistory: [74, 75, 76, 78, 79, 80, 81, 82, 83, 84, 85, 86],
    volumeHistory: [78, 82, 88, 92, 98, 90, 95, 102, 108, 100, 96, 93],
    yieldHistory: [5.5, 5.4, 5.4, 5.3, 5.3, 5.2, 5.1, 5.1, 5.0, 5.0, 5.0, 5.0],
    description: 'The new-generation family community. Dubai Hills Estate by Emaar has rapidly become the preferred address for families seeking modern villas with golf course views, Dubai Hills Mall, and excellent schools. The fastest-appreciating villa market in Dubai.',
    keyDrivers: ['Emaar master-planned community quality', 'Dubai Hills Mall anchor', 'Top schools concentration', 'Golf course lifestyle', 'Family-friendly infrastructure'],
    riskFactors: ['Still delivering new phases — supply risk', 'Distance from beach', 'Premium pricing vs Arabian Ranches'],
    outlook: 'bullish',
    outlookReason: 'Strongest family demand in Dubai. Villa handovers completing, maturing the community. Mall and school infrastructure now operational. Replacing Emirates Hills as the family villa destination.',
    subAreas: ['Golf Course Villas', 'Parkway Vistas', 'Club Villas', 'Maple', 'Sidra', 'Fairway Vistas'],
    recentTransactions: [
      { id: 'dh1', date: '2026-03-20', propertyType: 'Villa', bedrooms: 6, size: 8500, price: 28000000, priceSqft: 3294, building: 'Fairway Vistas', isOffPlan: false, buyerNationality: 'Indian', paymentType: 'Mortgage' },
      { id: 'dh2', date: '2026-03-18', propertyType: 'Villa', bedrooms: 5, size: 6200, price: 18500000, priceSqft: 2984, building: 'Club Villas', isOffPlan: false, buyerNationality: 'British', paymentType: 'Cash' },
      { id: 'dh3', date: '2026-03-15', propertyType: 'Apartment', bedrooms: 3, size: 1800, price: 4200000, priceSqft: 2333, building: 'Park Heights', isOffPlan: false, buyerNationality: 'French', paymentType: 'Mortgage' },
      { id: 'dh4', date: '2026-03-12', propertyType: 'Townhouse', bedrooms: 4, size: 3200, price: 8500000, priceSqft: 2656, building: 'Maple', isOffPlan: false, buyerNationality: 'Emirati', paymentType: 'Cash' },
    ],
    activeInventory: [
      { propertyType: 'Villa', count: 120, avgPrice: 22000000, avgPriceSqft: 3100, avgSize: 7100, priceRange: { min: 8000000, max: 65000000 } },
      { propertyType: 'Townhouse', count: 85, avgPrice: 7500000, avgPriceSqft: 2400, avgSize: 3100, priceRange: { min: 4500000, max: 14000000 } },
      { propertyType: 'Apartment', count: 315, avgPrice: 3500000, avgPriceSqft: 2100, avgSize: 1650, priceRange: { min: 1500000, max: 9000000 } },
    ],
    priceBreakdown: [
      { propertyType: 'Villa', avgPriceSqft: 3100, change30d: 2.8, change90d: 7.2, changeYoY: 22.4 },
      { propertyType: 'Townhouse', avgPriceSqft: 2400, change30d: 2.0, change90d: 5.8, changeYoY: 18.6 },
      { propertyType: 'Apartment', avgPriceSqft: 2100, change30d: 1.5, change90d: 4.5, changeYoY: 15.2 },
    ],
    buyerDemographics: [
      { nationality: 'Indian', percent: 30, avgBudget: 12000000, preferredType: 'Villa' },
      { nationality: 'British', percent: 18, avgBudget: 15000000, preferredType: 'Villa' },
      { nationality: 'Emirati', percent: 12, avgBudget: 20000000, preferredType: 'Villa' },
      { nationality: 'French', percent: 8, avgBudget: 5000000, preferredType: 'Apartment' },
    ],
    rental: {
      avgRentStudio: 38000,
      avgRent1Bed: 58000,
      avgRent2Bed: 95000,
      avgRent3Bed: 165000,
      avgRent4PlusBed: 380000,
      occupancyRate: 91,
      shortTermRentalPct: 5,
      avgDaysOnMarketRental: 10,
      rentalPriceChange30d: 2.0,
      rentalPriceChangeYoY: 16.8,
    },
    serviceCharges: {
      avgPerSqft: 14,
      rangeMin: 10,
      rangeMax: 20,
      trend: 'increasing',
      changeYoY: 4.8,
    },
    supplyPipeline: [
      {
        name: 'Dubai Hills Vista',
        developer: 'Emaar',
        totalUnits: 280,
        propertyType: 'Villa',
        expectedDelivery: 'Q4 2026',
        status: 'Under Construction',
      },
      {
        name: 'Park Field',
        developer: 'Emaar',
        totalUnits: 500,
        propertyType: 'Apartment',
        expectedDelivery: 'Q2 2027',
        status: 'Launched',
      },
    ],
    liquidity: {
      avgDaysToSell: 25,
      negotiationMarginPct: 4.0,
      liquidityScore: 78,
      resaleVsOffPlanPct: 65,
    },
    regulatory: {
      tenure: 'Freehold',
      goldenVisaEligible: true,
      goldenVisaMinInvestment: 2000000,
      foreignOwnership: '100% Freehold',
      maxMortgageLTV: 75,
      dldRegistrationFee: 4,
      agentCommissionPct: 2,
      oqoodFee: 4,
    },
    lifestyle: {
      topSchools: ['GEMS Wellington Academy', 'Kings School Dubai Hills'],
      nearestHospital: 'Mediclinic Parkview',
      hospitalDistance: 4.2,
      nearestMetro: 'Dubai Hills Mall (planned)',
      metroDistance: 2.0,
      beachDistance: 15,
      nearestMall: 'Dubai Hills Mall',
      mallDistance: 0.5,
      airportDistance: 22,
      alMaktoumAirportDistance: 40,
      walkabilityScore: 45,
    },
    community: {
      establishedYear: 2014,
      maturityLevel: 'Maturing',
      occupancyRate: 91,
      ownerOccupierPct: 60,
      investorPct: 40,
      totalUnitsInArea: 22000,
      population: 48000,
    },
    priceTiers: [
      {
        tier: 'Ultra-Luxury',
        priceRangeMin: 25000000,
        priceRangeMax: 65000000,
        avgPriceSqft: 3800,
        pctOfMarket: 8,
      },
      {
        tier: 'Luxury',
        priceRangeMin: 8000000,
        priceRangeMax: 25000000,
        avgPriceSqft: 3100,
        pctOfMarket: 35,
      },
      {
        tier: 'Mid-Range',
        priceRangeMin: 1500000,
        priceRangeMax: 8000000,
        avgPriceSqft: 2100,
        pctOfMarket: 57,
      },
    ],
    seasonalPattern: {
      monthlyVolumeIndex: [88, 80, 75, 70, 65, 58, 68, 82, 105, 120, 128, 118],
      peakMonths: ['October', 'November', 'December'],
      slowMonths: ['June', 'July', 'August'],
      bestTimeToBuy: 'Jun-Aug',
      bestTimeToSell: 'Sep-Dec',
    },
  },
  {
    id: 'difc',
    name: 'DIFC',
    shortName: 'DFC',
    coordinates: { lat: 25.2096, lng: 55.2796 },
    demandScore: 80,
    demandTrend: 'rising',
    demandChange: 7.1,
    avgPriceSqft: 2650,
    priceChange30d: 1.2,
    priceChange90d: 3.8,
    priceChangeYoY: 13.5,
    avgRentalYield: 6.2,
    totalInventory: 185,
    newListings30d: 14,
    transactionCount90d: 65,
    avgTransactionValue: 6800000,
    topPropertyType: 'Apartment',
    topBuyerNationality: 'British',
    cashPercent: 68,
    priceHistory: [2320, 2350, 2380, 2400, 2430, 2460, 2490, 2520, 2560, 2590, 2620, 2650],
    demandHistory: [72, 73, 74, 75, 75, 76, 77, 78, 78, 79, 80, 80],
    volumeHistory: [18, 20, 22, 24, 22, 21, 23, 25, 24, 22, 22, 21],
    yieldHistory: [6.5, 6.5, 6.4, 6.4, 6.3, 6.3, 6.3, 6.2, 6.2, 6.2, 6.2, 6.2],
    description: 'Dubai International Financial Centre — the Square Mile of the Middle East. Limited residential supply within the gates drives premium pricing. Walk-to-work for finance professionals. Gate Avenue adding lifestyle dimension.',
    keyDrivers: ['Financial hub employment', 'Walk-to-work premium', 'Gate Avenue lifestyle', 'Limited residential supply', 'Corporate relocation demand'],
    riskFactors: ['Small market — low liquidity', 'Dependent on financial sector health', 'Business Bay offering cheaper alternatives'],
    outlook: 'neutral',
    outlookReason: 'Steady demand from finance professionals but small market size limits upside. New DIFC 2.0 expansion could add supply pressure.',
    subAreas: ['Gate Village', 'Liberty House', 'Central Park', 'DIFC Living', 'Sky Gardens'],
    recentTransactions: [
      { id: 'df1', date: '2026-03-19', propertyType: 'Apartment', bedrooms: 3, size: 2200, price: 8500000, priceSqft: 3864, building: 'DIFC Living', isOffPlan: false, buyerNationality: 'British', paymentType: 'Cash' },
      { id: 'df2', date: '2026-03-14', propertyType: 'Apartment', bedrooms: 2, size: 1400, price: 4800000, priceSqft: 3429, building: 'Sky Gardens', isOffPlan: false, buyerNationality: 'Indian', paymentType: 'Mortgage' },
    ],
    activeInventory: [
      { propertyType: 'Apartment', count: 185, avgPrice: 6800000, avgPriceSqft: 2650, avgSize: 2560, priceRange: { min: 2500000, max: 22000000 } },
    ],
    priceBreakdown: [
      { propertyType: 'Apartment', avgPriceSqft: 2650, change30d: 1.2, change90d: 3.8, changeYoY: 13.5 },
    ],
    buyerDemographics: [
      { nationality: 'British', percent: 28, avgBudget: 7500000, preferredType: 'Apartment' },
      { nationality: 'Indian', percent: 22, avgBudget: 5500000, preferredType: 'Apartment' },
      { nationality: 'American', percent: 12, avgBudget: 8000000, preferredType: 'Apartment' },
    ],
    rental: {
      avgRentStudio: 55000,
      avgRent1Bed: 85000,
      avgRent2Bed: 140000,
      avgRent3Bed: 220000,
      avgRent4PlusBed: 380000,
      occupancyRate: 96,
      shortTermRentalPct: 8,
      avgDaysOnMarketRental: 6,
      rentalPriceChange30d: 1.0,
      rentalPriceChangeYoY: 11.5,
    },
    serviceCharges: {
      avgPerSqft: 28,
      rangeMin: 22,
      rangeMax: 38,
      trend: 'increasing',
      changeYoY: 7.5,
    },
    supplyPipeline: [
      {
        name: 'DIFC Living Phase 2',
        developer: 'DIFC Authority',
        totalUnits: 320,
        propertyType: 'Apartment',
        expectedDelivery: '2028',
        status: 'Planned',
      },
    ],
    liquidity: {
      avgDaysToSell: 35,
      negotiationMarginPct: 4.5,
      liquidityScore: 55,
      resaleVsOffPlanPct: 92,
    },
    regulatory: {
      tenure: 'Freehold',
      goldenVisaEligible: true,
      goldenVisaMinInvestment: 2000000,
      foreignOwnership: '100% Freehold',
      maxMortgageLTV: 75,
      dldRegistrationFee: 4,
      agentCommissionPct: 2,
    },
    lifestyle: {
      topSchools: ['Jumeirah English Speaking School'],
      nearestHospital: 'Mediclinic City Hospital',
      hospitalDistance: 2.0,
      nearestMetro: 'Financial Centre',
      metroDistance: 0.2,
      beachDistance: 14,
      nearestMall: 'Gate Avenue',
      mallDistance: 0.1,
      airportDistance: 12,
      alMaktoumAirportDistance: 55,
      walkabilityScore: 88,
    },
    community: {
      establishedYear: 2004,
      maturityLevel: 'Established',
      occupancyRate: 96,
      ownerOccupierPct: 30,
      investorPct: 70,
      totalUnitsInArea: 3500,
      population: 8000,
    },
    priceTiers: [
      {
        tier: 'Luxury',
        priceRangeMin: 8000000,
        priceRangeMax: 22000000,
        avgPriceSqft: 3800,
        pctOfMarket: 40,
      },
      {
        tier: 'Mid-Range',
        priceRangeMin: 2500000,
        priceRangeMax: 8000000,
        avgPriceSqft: 2650,
        pctOfMarket: 60,
      },
    ],
    seasonalPattern: {
      monthlyVolumeIndex: [95, 88, 82, 75, 68, 62, 72, 85, 105, 120, 130, 118],
      peakMonths: ['October', 'November', 'December', 'January'],
      slowMonths: ['June', 'July', 'August'],
      bestTimeToBuy: 'Jun-Aug',
      bestTimeToSell: 'Oct-Jan',
    },
  },
  {
    id: 'dubai-south',
    name: 'Dubai South',
    shortName: 'DST',
    coordinates: { lat: 24.9000, lng: 55.1700 },
    demandScore: 65,
    demandTrend: 'rising',
    demandChange: 18.5,
    avgPriceSqft: 850,
    priceChange30d: 2.8,
    priceChange90d: 8.2,
    priceChangeYoY: 28.4,
    avgRentalYield: 7.8,
    totalInventory: 2200,
    newListings30d: 280,
    transactionCount90d: 680,
    avgTransactionValue: 1200000,
    topPropertyType: 'Apartment',
    topBuyerNationality: 'Indian',
    cashPercent: 42,
    priceHistory: [640, 660, 680, 700, 720, 740, 760, 780, 800, 820, 840, 850],
    demandHistory: [45, 47, 49, 51, 53, 55, 57, 59, 61, 62, 64, 65],
    volumeHistory: [180, 195, 210, 228, 245, 230, 240, 258, 272, 248, 240, 227],
    yieldHistory: [8.2, 8.2, 8.1, 8.1, 8.0, 8.0, 7.9, 7.9, 7.9, 7.8, 7.8, 7.8],
    description: 'The growth story. Dubai South is anchored by Al Maktoum International Airport expansion and Expo City legacy. Entry-level pricing attracts first-time buyers and yield-focused investors. Highest appreciation rate in Dubai over the past 12 months.',
    keyDrivers: ['Al Maktoum Airport expansion', 'Expo City Dubai legacy district', 'Lowest entry prices in new Dubai', 'Highest yields in the market', 'Master-planned community by Dubai Government'],
    riskFactors: ['Distance from established areas', 'Infrastructure still developing', 'Oversupply risk from mass off-plan launches', 'Liquidity concerns for resale'],
    outlook: 'bullish',
    outlookReason: 'Airport expansion is a structural catalyst. Government backing ensures infrastructure delivery. Entry pricing creates headroom for appreciation. Yield-focused investors continue buying.',
    subAreas: ['The Pulse', 'Emaar South', 'Expo City', 'Aviation District', 'Residential District'],
    recentTransactions: [
      { id: 'ds1', date: '2026-03-21', propertyType: 'Apartment', bedrooms: 2, size: 1100, price: 1050000, priceSqft: 955, building: 'The Pulse', isOffPlan: true, buyerNationality: 'Indian', paymentType: 'Mortgage' },
      { id: 'ds2', date: '2026-03-20', propertyType: 'Townhouse', bedrooms: 3, size: 2200, price: 2200000, priceSqft: 1000, building: 'Emaar South', isOffPlan: true, buyerNationality: 'Pakistani', paymentType: 'Mortgage' },
      { id: 'ds3', date: '2026-03-18', propertyType: 'Apartment', bedrooms: 1, size: 650, price: 620000, priceSqft: 954, building: 'Expo City', isOffPlan: false, buyerNationality: 'Indian', paymentType: 'Cash' },
    ],
    activeInventory: [
      { propertyType: 'Apartment', count: 1800, avgPrice: 950000, avgPriceSqft: 850, avgSize: 1120, priceRange: { min: 450000, max: 2800000 } },
      { propertyType: 'Townhouse', count: 400, avgPrice: 2200000, avgPriceSqft: 1000, avgSize: 2200, priceRange: { min: 1500000, max: 4500000 } },
    ],
    priceBreakdown: [
      { propertyType: 'Apartment', avgPriceSqft: 850, change30d: 2.8, change90d: 8.2, changeYoY: 28.4 },
      { propertyType: 'Townhouse', avgPriceSqft: 1000, change30d: 2.5, change90d: 7.5, changeYoY: 25.8 },
    ],
    buyerDemographics: [
      { nationality: 'Indian', percent: 42, avgBudget: 1100000, preferredType: 'Apartment' },
      { nationality: 'Pakistani', percent: 18, avgBudget: 900000, preferredType: 'Apartment' },
      { nationality: 'Filipino', percent: 10, avgBudget: 750000, preferredType: 'Apartment' },
      { nationality: 'Egyptian', percent: 8, avgBudget: 850000, preferredType: 'Apartment' },
    ],
    rental: {
      avgRentStudio: 22000,
      avgRent1Bed: 35000,
      avgRent2Bed: 52000,
      avgRent3Bed: 75000,
      avgRent4PlusBed: 120000,
      occupancyRate: 82,
      shortTermRentalPct: 3,
      avgDaysOnMarketRental: 18,
      rentalPriceChange30d: 2.5,
      rentalPriceChangeYoY: 22.5,
    },
    serviceCharges: {
      avgPerSqft: 8,
      rangeMin: 6,
      rangeMax: 12,
      trend: 'stable',
      changeYoY: 3.2,
    },
    supplyPipeline: [
      {
        name: 'South Bay',
        developer: 'Dubai South Properties',
        totalUnits: 2000,
        propertyType: 'Mixed',
        expectedDelivery: '2027-2029',
        status: 'Under Construction',
      },
      {
        name: 'The Pulse Phase 5',
        developer: 'Dubai South Properties',
        totalUnits: 800,
        propertyType: 'Apartment',
        expectedDelivery: 'Q2 2027',
        status: 'Launched',
      },
      {
        name: 'Emaar South Phase 3',
        developer: 'Emaar',
        totalUnits: 1200,
        propertyType: 'Mixed',
        expectedDelivery: '2028',
        status: 'Under Construction',
      },
    ],
    liquidity: {
      avgDaysToSell: 42,
      negotiationMarginPct: 6.0,
      liquidityScore: 48,
      resaleVsOffPlanPct: 35,
    },
    regulatory: {
      tenure: 'Freehold',
      goldenVisaEligible: true,
      goldenVisaMinInvestment: 2000000,
      foreignOwnership: '100% Freehold',
      maxMortgageLTV: 80,
      dldRegistrationFee: 4,
      agentCommissionPct: 2,
      oqoodFee: 4,
    },
    lifestyle: {
      topSchools: ['JSS Private School'],
      nearestHospital: 'Aster Hospital',
      hospitalDistance: 8.5,
      nearestMetro: 'Expo 2020 (Route 2020)',
      metroDistance: 4.0,
      beachDistance: 35,
      nearestMall: 'Expo City Mall',
      mallDistance: 3.5,
      airportDistance: 55,
      alMaktoumAirportDistance: 5,
      walkabilityScore: 25,
    },
    community: {
      establishedYear: 2015,
      maturityLevel: 'Emerging',
      occupancyRate: 82,
      ownerOccupierPct: 20,
      investorPct: 80,
      totalUnitsInArea: 15000,
      population: 22000,
    },
    priceTiers: [
      {
        tier: 'Mid-Range',
        priceRangeMin: 800000,
        priceRangeMax: 2000000,
        avgPriceSqft: 950,
        pctOfMarket: 60,
      },
      {
        tier: 'Affordable',
        priceRangeMin: 450000,
        priceRangeMax: 800000,
        avgPriceSqft: 750,
        pctOfMarket: 40,
      },
    ],
    seasonalPattern: {
      monthlyVolumeIndex: [98, 92, 88, 82, 78, 72, 80, 90, 105, 115, 118, 112],
      peakMonths: ['October', 'November', 'December'],
      slowMonths: ['June', 'July', 'August'],
      bestTimeToBuy: 'Jun-Aug',
      bestTimeToSell: 'Sep-Nov',
    },
  },
  {
    id: 'jbr',
    name: 'JBR',
    shortName: 'JBR',
    coordinates: { lat: 25.0787, lng: 55.1326 },
    demandScore: 84,
    demandTrend: 'stable',
    demandChange: 4.2,
    avgPriceSqft: 2350,
    priceChange30d: 0.9,
    priceChange90d: 2.8,
    priceChangeYoY: 11.2,
    avgRentalYield: 5.8,
    totalInventory: 380,
    newListings30d: 32,
    transactionCount90d: 145,
    avgTransactionValue: 5800000,
    topPropertyType: 'Apartment',
    topBuyerNationality: 'Russian',
    cashPercent: 62,
    priceHistory: [2100, 2120, 2140, 2160, 2180, 2200, 2220, 2250, 2280, 2310, 2330, 2350],
    demandHistory: [80, 80, 81, 81, 82, 82, 83, 83, 83, 84, 84, 84],
    volumeHistory: [42, 44, 46, 48, 50, 47, 48, 52, 54, 50, 49, 48],
    yieldHistory: [6.0, 6.0, 5.9, 5.9, 5.9, 5.8, 5.8, 5.8, 5.8, 5.8, 5.8, 5.8],
    description: 'The Walk meets the beach. JBR is the lifestyle destination — beachfront living with The Walk promenade, dining, and Ain Dubai. Popular with short-term rental investors due to tourism demand.',
    keyDrivers: ['Beachfront lifestyle', 'The Walk retail and dining', 'Ain Dubai landmark', 'Short-term rental demand', 'Bluewaters Island proximity'],
    riskFactors: ['No new supply possible', 'Aging Rimal and Murjan towers', 'High service charges'],
    outlook: 'neutral',
    outlookReason: 'Mature market with stable demand. No new supply keeps pricing firm but appreciation is moderate. Short-term rental regulation changes could impact investor returns.',
    subAreas: ['Rimal', 'Murjan', 'Bahar', 'Sadaf', 'Amwaj', 'Shams'],
    recentTransactions: [
      { id: 'jb1', date: '2026-03-20', propertyType: 'Apartment', bedrooms: 3, size: 2400, price: 6200000, priceSqft: 2583, building: 'Rimal', isOffPlan: false, buyerNationality: 'Russian', paymentType: 'Cash' },
      { id: 'jb2', date: '2026-03-17', propertyType: 'Apartment', bedrooms: 2, size: 1400, price: 3800000, priceSqft: 2714, building: 'Murjan', isOffPlan: false, buyerNationality: 'British', paymentType: 'Cash' },
      { id: 'jb3', date: '2026-03-14', propertyType: 'Apartment', bedrooms: 4, size: 3200, price: 9500000, priceSqft: 2969, building: 'Sadaf', isOffPlan: false, buyerNationality: 'Indian', paymentType: 'Mortgage' },
    ],
    activeInventory: [
      { propertyType: 'Apartment', count: 380, avgPrice: 5800000, avgPriceSqft: 2350, avgSize: 2470, priceRange: { min: 1800000, max: 22000000 } },
    ],
    priceBreakdown: [
      { propertyType: 'Apartment', avgPriceSqft: 2350, change30d: 0.9, change90d: 2.8, changeYoY: 11.2 },
    ],
    buyerDemographics: [
      { nationality: 'Russian', percent: 25, avgBudget: 6000000, preferredType: 'Apartment' },
      { nationality: 'British', percent: 20, avgBudget: 5500000, preferredType: 'Apartment' },
      { nationality: 'Indian', percent: 15, avgBudget: 4500000, preferredType: 'Apartment' },
      { nationality: 'German', percent: 8, avgBudget: 5000000, preferredType: 'Apartment' },
    ],
    rental: {
      avgRentStudio: 55000,
      avgRent1Bed: 85000,
      avgRent2Bed: 135000,
      avgRent3Bed: 210000,
      avgRent4PlusBed: 380000,
      occupancyRate: 94,
      shortTermRentalPct: 32,
      avgDaysOnMarketRental: 9,
      rentalPriceChange30d: 0.8,
      rentalPriceChangeYoY: 9.5,
    },
    serviceCharges: {
      avgPerSqft: 22,
      rangeMin: 18,
      rangeMax: 30,
      trend: 'increasing',
      changeYoY: 7.0,
    },
    supplyPipeline: [],
    liquidity: {
      avgDaysToSell: 30,
      negotiationMarginPct: 4.0,
      liquidityScore: 72,
      resaleVsOffPlanPct: 98,
    },
    regulatory: {
      tenure: 'Freehold',
      goldenVisaEligible: true,
      goldenVisaMinInvestment: 2000000,
      foreignOwnership: '100% Freehold',
      maxMortgageLTV: 75,
      dldRegistrationFee: 4,
      agentCommissionPct: 2,
    },
    lifestyle: {
      topSchools: ['GEMS First Point', 'Dubai International Academy'],
      nearestHospital: 'Mediclinic Marina',
      hospitalDistance: 1.2,
      nearestMetro: 'JLT',
      metroDistance: 1.5,
      beachDistance: 0,
      nearestMall: 'The Walk',
      mallDistance: 0,
      airportDistance: 32,
      alMaktoumAirportDistance: 48,
      walkabilityScore: 90,
    },
    community: {
      establishedYear: 2006,
      maturityLevel: 'Established',
      occupancyRate: 94,
      ownerOccupierPct: 32,
      investorPct: 68,
      totalUnitsInArea: 6900,
      population: 18000,
    },
    priceTiers: [
      {
        tier: 'Luxury',
        priceRangeMin: 8000000,
        priceRangeMax: 22000000,
        avgPriceSqft: 3200,
        pctOfMarket: 15,
      },
      {
        tier: 'Mid-Range',
        priceRangeMin: 2000000,
        priceRangeMax: 8000000,
        avgPriceSqft: 2350,
        pctOfMarket: 70,
      },
      {
        tier: 'Affordable',
        priceRangeMin: 1800000,
        priceRangeMax: 2000000,
        avgPriceSqft: 2000,
        pctOfMarket: 15,
      },
    ],
    seasonalPattern: {
      monthlyVolumeIndex: [88, 78, 72, 68, 62, 58, 68, 82, 108, 128, 132, 120],
      peakMonths: ['October', 'November', 'December', 'January'],
      slowMonths: ['June', 'July', 'August'],
      bestTimeToBuy: 'Jun-Aug',
      bestTimeToSell: 'Oct-Jan',
    },
  },
  {
    id: 'mbr-city',
    name: 'MBR City',
    shortName: 'MBR',
    coordinates: { lat: 25.1500, lng: 55.3100 },
    demandScore: 72,
    demandTrend: 'rising',
    demandChange: 14.2,
    avgPriceSqft: 1650,
    priceChange30d: 2.4,
    priceChange90d: 7.2,
    priceChangeYoY: 24.5,
    avgRentalYield: 5.5,
    totalInventory: 850,
    newListings30d: 78,
    transactionCount90d: 320,
    avgTransactionValue: 4500000,
    topPropertyType: 'Villa',
    topBuyerNationality: 'Indian',
    cashPercent: 55,
    priceHistory: [1300, 1330, 1360, 1390, 1420, 1450, 1480, 1510, 1550, 1590, 1620, 1650],
    demandHistory: [58, 59, 60, 62, 63, 64, 66, 67, 68, 70, 71, 72],
    volumeHistory: [85, 92, 98, 105, 112, 102, 108, 118, 125, 115, 110, 107],
    yieldHistory: [6.0, 5.9, 5.9, 5.8, 5.8, 5.7, 5.7, 5.6, 5.6, 5.5, 5.5, 5.5],
    description: 'Mohammed Bin Rashid City — the emerging mega-district. Crystal Lagoon, District One villas, and massive master-planned communities. Still developing but appreciation has been extraordinary. The next-generation alternative to Emirates Hills.',
    keyDrivers: ['Crystal Lagoon attraction', 'District One ultra-luxury villas', 'Master plan scale', 'Meydan racecourse anchor', 'Future metro connectivity'],
    riskFactors: ['Still heavily under construction', 'Large off-plan pipeline', 'Distance to beach', 'Community maturity timeline'],
    outlook: 'bullish',
    outlookReason: 'Structural growth story. Crystal Lagoon operational, District One delivering trophy villas. Government-backed infrastructure investment continues. Price gap to established areas provides appreciation headroom.',
    subAreas: ['District One', 'District 7', 'Crystal Lagoon', 'Meydan Horizon', 'Sobha Hartland'],
    recentTransactions: [
      { id: 'mb1', date: '2026-03-20', propertyType: 'Villa', bedrooms: 6, size: 10000, price: 42000000, priceSqft: 4200, building: 'District One', isOffPlan: false, buyerNationality: 'Emirati', paymentType: 'Cash' },
      { id: 'mb2', date: '2026-03-18', propertyType: 'Villa', bedrooms: 4, size: 4500, price: 8500000, priceSqft: 1889, building: 'Sobha Hartland', isOffPlan: false, buyerNationality: 'Indian', paymentType: 'Mortgage' },
      { id: 'mb3', date: '2026-03-15', propertyType: 'Apartment', bedrooms: 2, size: 1200, price: 2200000, priceSqft: 1833, building: 'Sobha Hartland Greens', isOffPlan: true, buyerNationality: 'Chinese', paymentType: 'Cash' },
    ],
    activeInventory: [
      { propertyType: 'Villa', count: 250, avgPrice: 15000000, avgPriceSqft: 2800, avgSize: 5400, priceRange: { min: 5000000, max: 85000000 } },
      { propertyType: 'Apartment', count: 600, avgPrice: 2200000, avgPriceSqft: 1400, avgSize: 1570, priceRange: { min: 900000, max: 6000000 } },
    ],
    priceBreakdown: [
      { propertyType: 'Villa', avgPriceSqft: 2800, change30d: 3.0, change90d: 8.5, changeYoY: 28.2 },
      { propertyType: 'Apartment', avgPriceSqft: 1400, change30d: 2.0, change90d: 6.0, changeYoY: 20.5 },
    ],
    buyerDemographics: [
      { nationality: 'Indian', percent: 28, avgBudget: 6000000, preferredType: 'Villa' },
      { nationality: 'Emirati', percent: 18, avgBudget: 25000000, preferredType: 'Villa' },
      { nationality: 'Chinese', percent: 12, avgBudget: 3000000, preferredType: 'Apartment' },
      { nationality: 'British', percent: 10, avgBudget: 8000000, preferredType: 'Villa' },
    ],
    rental: {
      avgRentStudio: 32000,
      avgRent1Bed: 50000,
      avgRent2Bed: 80000,
      avgRent3Bed: 135000,
      avgRent4PlusBed: 320000,
      occupancyRate: 86,
      shortTermRentalPct: 5,
      avgDaysOnMarketRental: 15,
      rentalPriceChange30d: 2.2,
      rentalPriceChangeYoY: 18.5,
    },
    serviceCharges: {
      avgPerSqft: 12,
      rangeMin: 8,
      rangeMax: 18,
      trend: 'increasing',
      changeYoY: 5.0,
    },
    supplyPipeline: [
      {
        name: 'Sobha Reserve',
        developer: 'Sobha',
        totalUnits: 800,
        propertyType: 'Villa',
        expectedDelivery: '2027',
        status: 'Under Construction',
      },
      {
        name: 'District One Phase 2',
        developer: 'Meydan',
        totalUnits: 400,
        propertyType: 'Villa',
        expectedDelivery: '2028',
        status: 'Launched',
      },
      {
        name: 'Hartland Waves',
        developer: 'Sobha',
        totalUnits: 650,
        propertyType: 'Apartment',
        expectedDelivery: 'Q4 2026',
        status: 'Under Construction',
      },
    ],
    liquidity: {
      avgDaysToSell: 38,
      negotiationMarginPct: 5.5,
      liquidityScore: 52,
      resaleVsOffPlanPct: 55,
    },
    regulatory: {
      tenure: 'Freehold',
      goldenVisaEligible: true,
      goldenVisaMinInvestment: 2000000,
      foreignOwnership: '100% Freehold',
      maxMortgageLTV: 75,
      dldRegistrationFee: 4,
      agentCommissionPct: 2,
      oqoodFee: 4,
    },
    lifestyle: {
      topSchools: ['Hartland International School', 'North London Collegiate'],
      nearestHospital: 'Fakeeh University Hospital',
      hospitalDistance: 5.0,
      nearestMetro: 'Ras Al Khor (planned)',
      metroDistance: 6.0,
      beachDistance: 18,
      nearestMall: 'Meydan One (planned)',
      mallDistance: 2.0,
      airportDistance: 12,
      alMaktoumAirportDistance: 48,
      walkabilityScore: 30,
    },
    community: {
      establishedYear: 2012,
      maturityLevel: 'Emerging',
      occupancyRate: 86,
      ownerOccupierPct: 45,
      investorPct: 55,
      totalUnitsInArea: 18000,
      population: 28000,
    },
    priceTiers: [
      {
        tier: 'Ultra-Luxury',
        priceRangeMin: 25000000,
        priceRangeMax: 85000000,
        avgPriceSqft: 4200,
        pctOfMarket: 10,
      },
      {
        tier: 'Luxury',
        priceRangeMin: 5000000,
        priceRangeMax: 25000000,
        avgPriceSqft: 2800,
        pctOfMarket: 35,
      },
      {
        tier: 'Mid-Range',
        priceRangeMin: 900000,
        priceRangeMax: 5000000,
        avgPriceSqft: 1400,
        pctOfMarket: 55,
      },
    ],
    seasonalPattern: {
      monthlyVolumeIndex: [92, 85, 80, 74, 70, 64, 72, 86, 105, 118, 125, 115],
      peakMonths: ['October', 'November', 'December'],
      slowMonths: ['June', 'July', 'August'],
      bestTimeToBuy: 'Jun-Aug',
      bestTimeToSell: 'Oct-Dec',
    },
  },
  {
    id: 'jge',
    name: 'Jumeirah Golf Estates',
    shortName: 'JGE',
    coordinates: { lat: 25.0335, lng: 55.1810 },
    demandScore: 74,
    demandTrend: 'stable',
    demandChange: 5.5,
    avgPriceSqft: 1950,
    priceChange30d: 1.0,
    priceChange90d: 3.2,
    priceChangeYoY: 14.8,
    avgRentalYield: 4.5,
    totalInventory: 120,
    newListings30d: 8,
    transactionCount90d: 35,
    avgTransactionValue: 18000000,
    topPropertyType: 'Villa',
    topBuyerNationality: 'British',
    cashPercent: 78,
    priceHistory: [1680, 1700, 1720, 1750, 1780, 1800, 1830, 1860, 1880, 1910, 1930, 1950],
    demandHistory: [68, 69, 69, 70, 70, 71, 71, 72, 73, 73, 74, 74],
    volumeHistory: [10, 11, 12, 13, 12, 11, 12, 14, 13, 12, 12, 11],
    yieldHistory: [4.8, 4.7, 4.7, 4.6, 4.6, 4.6, 4.5, 4.5, 4.5, 4.5, 4.5, 4.5],
    description: 'Championship golf course living. Home of the DP World Tour Championship. Attracts golf-lifestyle families and sports-oriented UHNW buyers. Lower density than Emirates Hills with larger plots.',
    keyDrivers: ['Championship golf courses (Fire & Earth)', 'DP World Tour Championship prestige', 'Large plot sizes', 'Family community', 'Proximity to Al Maktoum Airport'],
    riskFactors: ['Distance from central Dubai', 'Low liquidity market', 'Competition from Dubai Hills golf villas'],
    outlook: 'neutral',
    outlookReason: 'Niche market with steady demand from golf lifestyle buyers. Price growth moderate but consistent. Limited new supply supports pricing.',
    subAreas: ['Fire Course', 'Earth Course', 'Whispering Pines', 'Flame Tree Ridge', 'Wildflower'],
    recentTransactions: [
      { id: 'jg1', date: '2026-03-18', propertyType: 'Villa', bedrooms: 5, size: 8000, price: 22000000, priceSqft: 2750, building: 'Fire Course', isOffPlan: false, buyerNationality: 'British', paymentType: 'Cash' },
      { id: 'jg2', date: '2026-03-10', propertyType: 'Villa', bedrooms: 6, size: 10500, price: 28000000, priceSqft: 2667, building: 'Earth Course', isOffPlan: false, buyerNationality: 'South African', paymentType: 'Cash' },
    ],
    activeInventory: [
      { propertyType: 'Villa', count: 120, avgPrice: 18000000, avgPriceSqft: 1950, avgSize: 9200, priceRange: { min: 8000000, max: 55000000 } },
    ],
    priceBreakdown: [
      { propertyType: 'Villa', avgPriceSqft: 1950, change30d: 1.0, change90d: 3.2, changeYoY: 14.8 },
    ],
    buyerDemographics: [
      { nationality: 'British', percent: 30, avgBudget: 20000000, preferredType: 'Villa' },
      { nationality: 'South African', percent: 15, avgBudget: 15000000, preferredType: 'Villa' },
      { nationality: 'Indian', percent: 12, avgBudget: 18000000, preferredType: 'Villa' },
      { nationality: 'European', percent: 10, avgBudget: 22000000, preferredType: 'Villa' },
    ],
    rental: {
      avgRentStudio: 0,
      avgRent1Bed: 0,
      avgRent2Bed: 0,
      avgRent3Bed: 180000,
      avgRent4PlusBed: 350000,
      occupancyRate: 88,
      shortTermRentalPct: 3,
      avgDaysOnMarketRental: 22,
      rentalPriceChange30d: 0.8,
      rentalPriceChangeYoY: 10.2,
    },
    serviceCharges: {
      avgPerSqft: 10,
      rangeMin: 7,
      rangeMax: 15,
      trend: 'stable',
      changeYoY: 3.5,
    },
    supplyPipeline: [
      {
        name: 'Alandalus Phase 2',
        developer: 'Jumeirah Golf Estates',
        totalUnits: 150,
        propertyType: 'Villa',
        expectedDelivery: '2027',
        status: 'Under Construction',
      },
    ],
    liquidity: {
      avgDaysToSell: 65,
      negotiationMarginPct: 6.0,
      liquidityScore: 38,
      resaleVsOffPlanPct: 92,
    },
    regulatory: {
      tenure: 'Freehold',
      goldenVisaEligible: true,
      goldenVisaMinInvestment: 2000000,
      foreignOwnership: '100% Freehold',
      maxMortgageLTV: 70,
      dldRegistrationFee: 4,
      agentCommissionPct: 2,
    },
    lifestyle: {
      topSchools: ['Victory Heights Primary', 'Ranches Primary'],
      nearestHospital: 'Mediclinic Parkview',
      hospitalDistance: 8.0,
      nearestMetro: 'None nearby',
      metroDistance: 12.0,
      beachDistance: 18,
      nearestMall: 'Ibn Battuta',
      mallDistance: 6.0,
      airportDistance: 38,
      alMaktoumAirportDistance: 18,
      walkabilityScore: 20,
    },
    community: {
      establishedYear: 2008,
      maturityLevel: 'Established',
      occupancyRate: 88,
      ownerOccupierPct: 70,
      investorPct: 30,
      totalUnitsInArea: 2200,
      population: 8500,
    },
    priceTiers: [
      {
        tier: 'Luxury',
        priceRangeMin: 15000000,
        priceRangeMax: 55000000,
        avgPriceSqft: 2800,
        pctOfMarket: 40,
      },
      {
        tier: 'Mid-Range',
        priceRangeMin: 8000000,
        priceRangeMax: 15000000,
        avgPriceSqft: 1800,
        pctOfMarket: 60,
      },
    ],
    seasonalPattern: {
      monthlyVolumeIndex: [82, 75, 70, 65, 60, 55, 62, 78, 108, 130, 135, 120],
      peakMonths: ['October', 'November', 'December'],
      slowMonths: ['June', 'July', 'August'],
      bestTimeToBuy: 'Jun-Aug',
      bestTimeToSell: 'Oct-Dec',
    },
  },
]

// ---------------------------------------------------------------------------
// EXPORT: Real DLD data (40 areas) or mock fallback (11 areas)
// ---------------------------------------------------------------------------

export const areas: AreaProfile[] = USE_REAL_AREA_DATA ? REAL_AREA_PROFILES : mockAreas

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

export function getArea(id: string): AreaProfile | undefined {
  return areas.find(a => a.id === id)
}

export function getAreaByName(name: string): AreaProfile | undefined {
  return areas.find(a => a.name.toLowerCase().includes(name.toLowerCase()))
}

export function getAreasSorted(by: 'demand' | 'price' | 'yield' | 'growth' = 'demand'): AreaProfile[] {
  const sorted = [...areas]
  switch (by) {
    case 'demand': return sorted.sort((a, b) => b.demandScore - a.demandScore)
    case 'price': return sorted.sort((a, b) => b.avgPriceSqft - a.avgPriceSqft)
    case 'yield': return sorted.sort((a, b) => b.avgRentalYield - a.avgRentalYield)
    case 'growth': return sorted.sort((a, b) => b.priceChangeYoY - a.priceChangeYoY)
    default: return sorted
  }
}

export function getTopAreas(count: number = 5): AreaProfile[] {
  return getAreasSorted('demand').slice(0, count)
}

export const MONTHS = ['Jan', 'Feb', 'Mar']

// ============================================================================
// BUILDING PRICE INTELLIGENCE
// ============================================================================

export interface BuildingPrice {
  building: string
  area: string
  areaId: string
  avgPriceSqft: number           // AED/sqft
  minPriceSqft: number
  maxPriceSqft: number
  premiumVsArea: number          // % above/below area avg
  totalTransactions12m: number
  priceChange30d: number         // percent
  priceChange90d: number         // percent
  priceChangeYoY: number         // percent
  priceHistory: number[]         // 12 months
  avgSize: number                // sqft
  propertyTypes: string[]
  floorPremiumPct: number        // % premium per 10 floors
  seaViewPremiumPct: number      // % premium for sea view
  lastTransactionDate: string
  lastTransactionPrice: number   // AED
  avgDaysOnMarket: number
}

// Mock building price data for all areas
const mockBuildingPricesMarket: BuildingPrice[] = [
  // ── PALM JUMEIRAH (PLM) ──
  {
    building: 'Atlantis The Royal Residences',
    area: 'Palm Jumeirah',
    areaId: 'plm',
    avgPriceSqft: 12850,
    minPriceSqft: 11200,
    maxPriceSqft: 14500,
    premiumVsArea: 18.5,
    totalTransactions12m: 45,
    priceChange30d: 2.3,
    priceChange90d: 4.1,
    priceChangeYoY: 8.7,
    priceHistory: [12100, 12250, 12400, 12550, 12650, 12750, 12800, 12850, 12900, 12950, 13000, 12850],
    avgSize: 6200,
    propertyTypes: ['Apartment', 'Penthouse'],
    floorPremiumPct: 3.2,
    seaViewPremiumPct: 22.5,
    lastTransactionDate: '2026-03-22',
    lastTransactionPrice: 95000000,
    avgDaysOnMarket: 28,
  },
  {
    building: 'Shoreline',
    area: 'Palm Jumeirah',
    areaId: 'plm',
    avgPriceSqft: 11200,
    minPriceSqft: 10100,
    maxPriceSqft: 12800,
    premiumVsArea: 2.8,
    totalTransactions12m: 32,
    priceChange30d: 1.1,
    priceChange90d: 2.3,
    priceChangeYoY: 5.2,
    priceHistory: [10900, 11000, 11050, 11150, 11200, 11250, 11300, 11350, 11400, 11300, 11250, 11200],
    avgSize: 4800,
    propertyTypes: ['Apartment', 'Townhouse'],
    floorPremiumPct: 2.1,
    seaViewPremiumPct: 18.5,
    lastTransactionDate: '2026-03-20',
    lastTransactionPrice: 45000000,
    avgDaysOnMarket: 35,
  },
  {
    building: 'Palm Tower',
    area: 'Palm Jumeirah',
    areaId: 'plm',
    avgPriceSqft: 10900,
    minPriceSqft: 9800,
    maxPriceSqft: 12500,
    premiumVsArea: -0.2,
    totalTransactions12m: 38,
    priceChange30d: 0.5,
    priceChange90d: 1.8,
    priceChangeYoY: 4.1,
    priceHistory: [10500, 10600, 10700, 10750, 10800, 10850, 10900, 10950, 11000, 10950, 10925, 10900],
    avgSize: 3800,
    propertyTypes: ['Apartment'],
    floorPremiumPct: 2.8,
    seaViewPremiumPct: 25.0,
    lastTransactionDate: '2026-03-19',
    lastTransactionPrice: 38500000,
    avgDaysOnMarket: 32,
  },
  {
    building: 'Frond N',
    area: 'Palm Jumeirah',
    areaId: 'plm',
    avgPriceSqft: 13200,
    minPriceSqft: 12100,
    maxPriceSqft: 14800,
    premiumVsArea: 21.5,
    totalTransactions12m: 28,
    priceChange30d: 3.2,
    priceChange90d: 5.5,
    priceChangeYoY: 12.1,
    priceHistory: [11800, 11950, 12100, 12250, 12400, 12550, 12750, 12900, 13050, 13150, 13250, 13200],
    avgSize: 8100,
    propertyTypes: ['Villa', 'Penthouse'],
    floorPremiumPct: 1.5,
    seaViewPremiumPct: 28.0,
    lastTransactionDate: '2026-03-21',
    lastTransactionPrice: 185000000,
    avgDaysOnMarket: 22,
  },
  {
    building: 'Frond D',
    area: 'Palm Jumeirah',
    areaId: 'plm',
    avgPriceSqft: 12100,
    minPriceSqft: 11050,
    maxPriceSqft: 13500,
    premiumVsArea: 11.2,
    totalTransactions12m: 25,
    priceChange30d: 1.8,
    priceChange90d: 3.2,
    priceChangeYoY: 7.3,
    priceHistory: [11200, 11350, 11500, 11650, 11800, 11950, 12050, 12100, 12150, 12200, 12150, 12100],
    avgSize: 7200,
    propertyTypes: ['Villa'],
    floorPremiumPct: 0.0,
    seaViewPremiumPct: 20.0,
    lastTransactionDate: '2026-03-18',
    lastTransactionPrice: 78000000,
    avgDaysOnMarket: 26,
  },
  {
    building: 'Frond G',
    area: 'Palm Jumeirah',
    areaId: 'plm',
    avgPriceSqft: 12450,
    minPriceSqft: 11300,
    maxPriceSqft: 14200,
    premiumVsArea: 14.8,
    totalTransactions12m: 31,
    priceChange30d: 2.1,
    priceChange90d: 4.8,
    priceChangeYoY: 9.5,
    priceHistory: [11350, 11500, 11700, 11850, 12000, 12150, 12300, 12400, 12500, 12550, 12500, 12450],
    avgSize: 9200,
    propertyTypes: ['Villa', 'Penthouse'],
    floorPremiumPct: 0.0,
    seaViewPremiumPct: 24.5,
    lastTransactionDate: '2026-03-17',
    lastTransactionPrice: 165000000,
    avgDaysOnMarket: 24,
  },

  // ── MARINA (MR) ──
  {
    building: 'Marina Gate 1',
    area: 'Marina',
    areaId: 'mr',
    avgPriceSqft: 9800,
    minPriceSqft: 8500,
    maxPriceSqft: 11200,
    premiumVsArea: 8.5,
    totalTransactions12m: 56,
    priceChange30d: 1.5,
    priceChange90d: 2.8,
    priceChangeYoY: 6.2,
    priceHistory: [9200, 9350, 9450, 9550, 9650, 9750, 9800, 9850, 9900, 9850, 9825, 9800],
    avgSize: 4200,
    propertyTypes: ['Apartment', 'Penthouse'],
    floorPremiumPct: 2.8,
    seaViewPremiumPct: 15.0,
    lastTransactionDate: '2026-03-21',
    lastTransactionPrice: 52000000,
    avgDaysOnMarket: 38,
  },
  {
    building: 'Princess Tower',
    area: 'Marina',
    areaId: 'mr',
    avgPriceSqft: 8900,
    minPriceSqft: 7800,
    maxPriceSqft: 10500,
    premiumVsArea: -1.2,
    totalTransactions12m: 72,
    priceChange30d: 0.8,
    priceChange90d: 1.5,
    priceChangeYoY: 3.1,
    priceHistory: [8600, 8650, 8700, 8750, 8800, 8850, 8875, 8900, 8920, 8910, 8900, 8900],
    avgSize: 2100,
    propertyTypes: ['Apartment'],
    floorPremiumPct: 3.5,
    seaViewPremiumPct: 12.0,
    lastTransactionDate: '2026-03-19',
    lastTransactionPrice: 3200000,
    avgDaysOnMarket: 42,
  },
  {
    building: 'The Address Marina',
    area: 'Marina',
    areaId: 'mr',
    avgPriceSqft: 9500,
    minPriceSqft: 8200,
    maxPriceSqft: 11000,
    premiumVsArea: 4.8,
    totalTransactions12m: 48,
    priceChange30d: 1.2,
    priceChange90d: 2.5,
    priceChangeYoY: 5.8,
    priceHistory: [9000, 9100, 9200, 9300, 9400, 9450, 9500, 9550, 9600, 9550, 9525, 9500],
    avgSize: 3200,
    propertyTypes: ['Apartment', 'Penthouse'],
    floorPremiumPct: 2.5,
    seaViewPremiumPct: 18.5,
    lastTransactionDate: '2026-03-17',
    lastTransactionPrice: 5800000,
    avgDaysOnMarket: 40,
  },
  {
    building: 'Damac Heights',
    area: 'Marina',
    areaId: 'mr',
    avgPriceSqft: 8200,
    minPriceSqft: 7200,
    maxPriceSqft: 9500,
    premiumVsArea: -9.5,
    totalTransactions12m: 64,
    priceChange30d: -0.5,
    priceChange90d: 0.8,
    priceChangeYoY: 1.2,
    priceHistory: [8100, 8120, 8150, 8180, 8200, 8220, 8240, 8250, 8260, 8240, 8220, 8200],
    avgSize: 1800,
    propertyTypes: ['Apartment'],
    floorPremiumPct: 2.0,
    seaViewPremiumPct: 10.0,
    lastTransactionDate: '2026-03-15',
    lastTransactionPrice: 1950000,
    avgDaysOnMarket: 45,
  },
  {
    building: 'Marina Promenade',
    area: 'Marina',
    areaId: 'mr',
    avgPriceSqft: 9100,
    minPriceSqft: 7900,
    maxPriceSqft: 10800,
    premiumVsArea: 0.2,
    totalTransactions12m: 52,
    priceChange30d: 0.9,
    priceChange90d: 1.9,
    priceChangeYoY: 4.5,
    priceHistory: [8700, 8800, 8900, 8950, 9000, 9050, 9090, 9100, 9120, 9110, 9105, 9100],
    avgSize: 2800,
    propertyTypes: ['Apartment'],
    floorPremiumPct: 3.0,
    seaViewPremiumPct: 14.5,
    lastTransactionDate: '2026-03-13',
    lastTransactionPrice: 4100000,
    avgDaysOnMarket: 41,
  },

  // ── DOWNTOWN DUBAI (DT) ──
  {
    building: 'Burj Khalifa',
    area: 'Downtown Dubai',
    areaId: 'dt',
    avgPriceSqft: 10200,
    minPriceSqft: 8900,
    maxPriceSqft: 12800,
    premiumVsArea: 32.5,
    totalTransactions12m: 42,
    priceChange30d: 2.8,
    priceChange90d: 5.2,
    priceChangeYoY: 11.5,
    priceHistory: [9000, 9200, 9400, 9600, 9800, 10000, 10100, 10150, 10200, 10250, 10250, 10200],
    avgSize: 5200,
    propertyTypes: ['Apartment', 'Penthouse'],
    floorPremiumPct: 4.5,
    seaViewPremiumPct: 35.0,
    lastTransactionDate: '2026-03-20',
    lastTransactionPrice: 68000000,
    avgDaysOnMarket: 30,
  },
  {
    building: 'Act One Act Two',
    area: 'Downtown Dubai',
    areaId: 'dt',
    avgPriceSqft: 7200,
    minPriceSqft: 6100,
    maxPriceSqft: 8900,
    premiumVsArea: -6.5,
    totalTransactions12m: 58,
    priceChange30d: 0.6,
    priceChange90d: 1.2,
    priceChangeYoY: 2.8,
    priceHistory: [7000, 7050, 7100, 7120, 7150, 7170, 7190, 7200, 7210, 7215, 7210, 7200],
    avgSize: 2400,
    propertyTypes: ['Apartment'],
    floorPremiumPct: 1.8,
    seaViewPremiumPct: 8.5,
    lastTransactionDate: '2026-03-18',
    lastTransactionPrice: 7800000,
    avgDaysOnMarket: 48,
  },
  {
    building: 'The Address Downtown',
    area: 'Downtown Dubai',
    areaId: 'dt',
    avgPriceSqft: 7900,
    minPriceSqft: 6800,
    maxPriceSqft: 9400,
    premiumVsArea: 2.2,
    totalTransactions12m: 45,
    priceChange30d: 1.1,
    priceChange90d: 2.1,
    priceChangeYoY: 4.5,
    priceHistory: [7500, 7600, 7650, 7700, 7750, 7800, 7850, 7880, 7900, 7910, 7905, 7900],
    avgSize: 1800,
    propertyTypes: ['Apartment'],
    floorPremiumPct: 2.5,
    seaViewPremiumPct: 12.0,
    lastTransactionDate: '2026-03-16',
    lastTransactionPrice: 4500000,
    avgDaysOnMarket: 44,
  },
  {
    building: 'Fountain Views',
    area: 'Downtown Dubai',
    areaId: 'dt',
    avgPriceSqft: 7450,
    minPriceSqft: 6500,
    maxPriceSqft: 8800,
    premiumVsArea: -3.5,
    totalTransactions12m: 52,
    priceChange30d: 0.4,
    priceChange90d: 0.9,
    priceChangeYoY: 2.1,
    priceHistory: [7200, 7250, 7300, 7340, 7380, 7410, 7430, 7445, 7450, 7450, 7450, 7450],
    avgSize: 1300,
    propertyTypes: ['Apartment'],
    floorPremiumPct: 2.2,
    seaViewPremiumPct: 10.5,
    lastTransactionDate: '2026-03-14',
    lastTransactionPrice: 2800000,
    avgDaysOnMarket: 50,
  },

  // ── EMIRATES HILLS (EH) ──
  {
    building: 'Sector E',
    area: 'Emirates Hills',
    areaId: 'eh',
    avgPriceSqft: 10500,
    minPriceSqft: 9200,
    maxPriceSqft: 12100,
    premiumVsArea: 8.2,
    totalTransactions12m: 18,
    priceChange30d: 1.5,
    priceChange90d: 3.1,
    priceChangeYoY: 7.2,
    priceHistory: [9800, 9950, 10050, 10150, 10250, 10350, 10400, 10450, 10500, 10520, 10510, 10500],
    avgSize: 15000,
    propertyTypes: ['Villa'],
    floorPremiumPct: 0.0,
    seaViewPremiumPct: 0.0,
    lastTransactionDate: '2026-03-15',
    lastTransactionPrice: 220000000,
    avgDaysOnMarket: 35,
  },
  {
    building: 'Sector P',
    area: 'Emirates Hills',
    areaId: 'eh',
    avgPriceSqft: 10100,
    minPriceSqft: 8900,
    maxPriceSqft: 11800,
    premiumVsArea: 4.2,
    totalTransactions12m: 16,
    priceChange30d: 0.8,
    priceChange90d: 1.8,
    priceChangeYoY: 4.5,
    priceHistory: [9650, 9750, 9820, 9900, 9980, 10050, 10080, 10100, 10120, 10110, 10105, 10100],
    avgSize: 14200,
    propertyTypes: ['Villa'],
    floorPremiumPct: 0.0,
    seaViewPremiumPct: 0.0,
    lastTransactionDate: '2026-03-08',
    lastTransactionPrice: 145000000,
    avgDaysOnMarket: 42,
  },
  {
    building: 'Sector V',
    area: 'Emirates Hills',
    areaId: 'eh',
    avgPriceSqft: 10250,
    minPriceSqft: 9100,
    maxPriceSqft: 11950,
    premiumVsArea: 5.8,
    totalTransactions12m: 17,
    priceChange30d: 1.2,
    priceChange90d: 2.5,
    priceChangeYoY: 5.8,
    priceHistory: [9700, 9830, 9930, 10030, 10120, 10180, 10220, 10250, 10270, 10260, 10255, 10250],
    avgSize: 15800,
    propertyTypes: ['Villa'],
    floorPremiumPct: 0.0,
    seaViewPremiumPct: 0.0,
    lastTransactionDate: '2026-02-28',
    lastTransactionPrice: 178000000,
    avgDaysOnMarket: 38,
  },

  // ── BUSINESS BAY (BB) ──
  {
    building: 'Damac Maison Canal Views',
    area: 'Business Bay',
    areaId: 'bb',
    avgPriceSqft: 5200,
    minPriceSqft: 4500,
    maxPriceSqft: 6200,
    premiumVsArea: 12.5,
    totalTransactions12m: 35,
    priceChange30d: 2.1,
    priceChange90d: 3.8,
    priceChangeYoY: 8.2,
    priceHistory: [4800, 4900, 5000, 5080, 5140, 5180, 5200, 5220, 5240, 5230, 5220, 5200],
    avgSize: 1400,
    propertyTypes: ['Apartment', 'Studio'],
    floorPremiumPct: 2.8,
    seaViewPremiumPct: 18.5,
    lastTransactionDate: '2026-03-21',
    lastTransactionPrice: 2800000,
    avgDaysOnMarket: 36,
  },
  {
    building: 'The Opus by Zaha Hadid',
    area: 'Business Bay',
    areaId: 'bb',
    avgPriceSqft: 5850,
    minPriceSqft: 5100,
    maxPriceSqft: 6800,
    premiumVsArea: 26.2,
    totalTransactions12m: 28,
    priceChange30d: 3.2,
    priceChange90d: 5.1,
    priceChangeYoY: 11.5,
    priceHistory: [5200, 5350, 5450, 5550, 5650, 5750, 5800, 5850, 5900, 5920, 5890, 5850],
    avgSize: 2100,
    propertyTypes: ['Apartment', 'Penthouse'],
    floorPremiumPct: 3.5,
    seaViewPremiumPct: 22.0,
    lastTransactionDate: '2026-03-19',
    lastTransactionPrice: 4200000,
    avgDaysOnMarket: 28,
  },
  {
    building: 'Bay Square',
    area: 'Business Bay',
    areaId: 'bb',
    avgPriceSqft: 4600,
    minPriceSqft: 4000,
    maxPriceSqft: 5500,
    premiumVsArea: -0.8,
    totalTransactions12m: 42,
    priceChange30d: 1.0,
    priceChange90d: 1.9,
    priceChangeYoY: 3.5,
    priceHistory: [4450, 4480, 4510, 4540, 4570, 4590, 4600, 4610, 4620, 4615, 4608, 4600],
    avgSize: 900,
    propertyTypes: ['Apartment', 'Studio'],
    floorPremiumPct: 2.2,
    seaViewPremiumPct: 15.0,
    lastTransactionDate: '2026-03-17',
    lastTransactionPrice: 1450000,
    avgDaysOnMarket: 40,
  },

  // ── DUBAI HILLS ESTATE (DH) ──
  {
    building: 'Fairway Vistas',
    area: 'Dubai Hills Estate',
    areaId: 'dh',
    avgPriceSqft: 3450,
    minPriceSqft: 3000,
    maxPriceSqft: 4100,
    premiumVsArea: 5.2,
    totalTransactions12m: 24,
    priceChange30d: 0.8,
    priceChange90d: 1.8,
    priceChangeYoY: 4.2,
    priceHistory: [3300, 3340, 3370, 3400, 3420, 3440, 3450, 3460, 3470, 3465, 3460, 3450],
    avgSize: 8100,
    propertyTypes: ['Villa'],
    floorPremiumPct: 0.0,
    seaViewPremiumPct: 0.0,
    lastTransactionDate: '2026-03-20',
    lastTransactionPrice: 28000000,
    avgDaysOnMarket: 32,
  },
  {
    building: 'Club Villas',
    area: 'Dubai Hills Estate',
    areaId: 'dh',
    avgPriceSqft: 3150,
    minPriceSqft: 2800,
    maxPriceSqft: 3800,
    premiumVsArea: -4.1,
    totalTransactions12m: 19,
    priceChange30d: 0.3,
    priceChange90d: 0.8,
    priceChangeYoY: 1.9,
    priceHistory: [3100, 3110, 3120, 3130, 3140, 3145, 3150, 3155, 3160, 3158, 3154, 3150],
    avgSize: 6800,
    propertyTypes: ['Villa'],
    floorPremiumPct: 0.0,
    seaViewPremiumPct: 0.0,
    lastTransactionDate: '2026-03-18',
    lastTransactionPrice: 18500000,
    avgDaysOnMarket: 38,
  },
  {
    building: 'Park Heights',
    area: 'Dubai Hills Estate',
    areaId: 'dh',
    avgPriceSqft: 2800,
    minPriceSqft: 2400,
    maxPriceSqft: 3400,
    premiumVsArea: -14.8,
    totalTransactions12m: 31,
    priceChange30d: -0.2,
    priceChange90d: 0.5,
    priceChangeYoY: 1.2,
    priceHistory: [2750, 2760, 2770, 2780, 2785, 2790, 2795, 2800, 2805, 2802, 2801, 2800],
    avgSize: 1800,
    propertyTypes: ['Apartment'],
    floorPremiumPct: 1.5,
    seaViewPremiumPct: 0.0,
    lastTransactionDate: '2026-03-15',
    lastTransactionPrice: 4200000,
    avgDaysOnMarket: 42,
  },
  {
    building: 'Maple',
    area: 'Dubai Hills Estate',
    areaId: 'dh',
    avgPriceSqft: 2950,
    minPriceSqft: 2600,
    maxPriceSqft: 3600,
    premiumVsArea: -10.1,
    totalTransactions12m: 26,
    priceChange30d: 0.2,
    priceChange90d: 0.7,
    priceChangeYoY: 2.1,
    priceHistory: [2880, 2890, 2900, 2910, 2920, 2930, 2940, 2950, 2960, 2955, 2952, 2950],
    avgSize: 3200,
    propertyTypes: ['Townhouse', 'Villa'],
    floorPremiumPct: 0.0,
    seaViewPremiumPct: 0.0,
    lastTransactionDate: '2026-03-12',
    lastTransactionPrice: 8500000,
    avgDaysOnMarket: 40,
  },

  // ── DIFC ──
  {
    building: 'DIFC Living',
    area: 'DIFC',
    areaId: 'df',
    avgPriceSqft: 4200,
    minPriceSqft: 3600,
    maxPriceSqft: 5200,
    premiumVsArea: 8.5,
    totalTransactions12m: 22,
    priceChange30d: 1.5,
    priceChange90d: 2.8,
    priceChangeYoY: 6.2,
    priceHistory: [3950, 4020, 4080, 4130, 4170, 4200, 4210, 4220, 4230, 4225, 4212, 4200],
    avgSize: 2200,
    propertyTypes: ['Apartment', 'Penthouse'],
    floorPremiumPct: 2.5,
    seaViewPremiumPct: 0.0,
    lastTransactionDate: '2026-03-19',
    lastTransactionPrice: 8500000,
    avgDaysOnMarket: 30,
  },
  {
    building: 'Sky Gardens',
    area: 'DIFC',
    areaId: 'df',
    avgPriceSqft: 3850,
    minPriceSqft: 3200,
    maxPriceSqft: 4800,
    premiumVsArea: -1.2,
    totalTransactions12m: 28,
    priceChange30d: 0.8,
    priceChange90d: 1.5,
    priceChangeYoY: 3.8,
    priceHistory: [3700, 3750, 3780, 3810, 3840, 3855, 3865, 3870, 3875, 3870, 3860, 3850],
    avgSize: 1600,
    propertyTypes: ['Apartment'],
    floorPremiumPct: 2.0,
    seaViewPremiumPct: 0.0,
    lastTransactionDate: '2026-03-14',
    lastTransactionPrice: 4800000,
    avgDaysOnMarket: 35,
  },
]

// Real building prices routing
import { REAL_BUILDING_PRICES, getRealBuildingPricesByArea } from './realDerivedData'
const USE_REAL_BUILDING_DATA = true
export const buildingPrices: BuildingPrice[] = USE_REAL_BUILDING_DATA ? REAL_BUILDING_PRICES : mockBuildingPricesMarket

export function getBuildingPricesByArea(areaId: string): BuildingPrice[] {
  return buildingPrices.filter(bp => bp.areaId === areaId)
}
