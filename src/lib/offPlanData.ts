// PCIS Off-Plan Intelligence
const USE_REAL_OFFPLAN = true

export interface PaymentMilestone {
  milestone: string
  percentage: number
  estimatedDate?: string
}

export interface PaymentPlan {
  name: string
  downPayment: number
  duringConstruction: number
  onHandover: number
  postHandover: number
  postHandoverMonths?: number
  installments: PaymentMilestone[]
}

export interface UnitMix {
  type: string
  count: number
  sizeRange: string
  priceFrom: number
  priceTo: number
  avgPriceSqft: number
  soldPct: number
  availableCount: number
}

export interface OffPlanProject {
  id: string
  projectName: string
  developer: string
  developerId: string
  area: string
  areaId: string
  subArea?: string
  status: 'Announced' | 'Launched' | 'Under Construction' | 'Near Completion' | 'Completed' | 'Handed Over'
  launchDate: string
  estimatedCompletion: string
  completionPct: number
  totalUnits: number
  soldUnits: number
  availableUnits: number
  soldPct: number
  propertyTypes: string[]
  priceFrom: number
  priceTo: number
  avgPriceSqft: number
  sizeFrom: number
  sizeTo: number
  paymentPlan: PaymentPlan
  escrowAccount: string
  reraNumber: string
  serviceChargeEstimate: number
  amenities: string[]
  usp: string
  areaAvgPriceSqft: number
  priceVsAreaAvg: number
  demandScore: number
  investorAppeal: 'High' | 'Medium' | 'Low'
  rentalYieldEstimate: number
  capitalGrowthEstimate: number
  unitMix: UnitMix[]
  salesVelocity: number
  lastSaleDate: string
  priceHistory: number[]
}

export interface Developer {
  id: string
  name: string
  shortName: string
  established: number
  headquarters: string
  totalProjectsDelivered: number
  totalProjectsActive: number
  totalUnitsDelivered: number
  avgCompletionDelay: number
  onTimeDeliveryPct: number
  qualityRating: number
  customerSatisfaction: number
  reraRating: string
  flagshipProjects: string[]
  activeProjects: string[]
  completedProjects: string[]
  specialization: string[]
  avgPriceSqft: number
  priceRange: { min: number; max: number }
  marketSharePct: number
  trend: 'growing' | 'stable' | 'declining'
  recentLaunches: { name: string; date: string; area: string }[]
  escrowCompliance: 'Full' | 'Partial' | 'Flagged'
  financialStability: 'Strong' | 'Stable' | 'Caution'
}

export interface ProjectLaunch {
  id: string
  projectId: string
  projectName: string
  developer: string
  developerId: string
  area: string
  areaId: string
  launchDate: string
  launchType: 'New Launch' | 'New Phase' | 'Price Revision' | 'Soft Launch' | 'VIP Preview'
  totalUnits: number
  priceFrom: number
  avgPriceSqft: number
  status: 'Upcoming' | 'Active' | 'Closed'
  daysUntilLaunch?: number
  earlyBirdDiscount?: number
  brokerCommission: number
  registrationDeadline?: string
}

export interface OffPlanSummary {
  totalActiveProjects: number
  totalUnitsAvailable: number
  avgPriceSqft: number
  topDeveloper: string
  hottestArea: string
  avgSoldPct: number
  upcomingLaunches: number
  totalValuePipeline: number
}

// Developer Data
export const developers: Developer[] = [
  {
    id: 'EMR',
    name: 'Emaar Properties',
    shortName: 'EMR',
    established: 1997,
    headquarters: 'Downtown Dubai',
    totalProjectsDelivered: 150,
    totalProjectsActive: 24,
    totalUnitsDelivered: 85000,
    avgCompletionDelay: -2,
    onTimeDeliveryPct: 78,
    qualityRating: 4.5,
    customerSatisfaction: 82,
    reraRating: 'A+',
    flagshipProjects: ['Burj Khalifa', 'Dubai Mall', 'Emirates Towers'],
    activeProjects: ['EMR-001', 'EMR-002', 'EMR-003', 'EMR-004', 'EMR-005'],
    completedProjects: ['Burj Khalifa', 'Dubai Mall', 'The Crescent', 'Emaar Beachfront'],
    specialization: ['Ultra-luxury', 'Waterfront', 'Master-planned'],
    avgPriceSqft: 3200,
    priceRange: { min: 1500000, max: 25000000 },
    marketSharePct: 22,
    trend: 'growing',
    recentLaunches: [
      { name: 'The Pinnacle Downtown', date: '2025-03-15', area: 'Downtown' },
      { name: 'Marina Skyline Phase III', date: '2025-02-01', area: 'Dubai Marina' }
    ],
    escrowCompliance: 'Full',
    financialStability: 'Strong'
  },
  {
    id: 'DMC',
    name: 'DAMAC Properties',
    shortName: 'DMC',
    established: 2002,
    headquarters: 'Business Bay',
    totalProjectsDelivered: 50,
    totalProjectsActive: 18,
    totalUnitsDelivered: 28000,
    avgCompletionDelay: 3,
    onTimeDeliveryPct: 65,
    qualityRating: 3.8,
    customerSatisfaction: 76,
    reraRating: 'A',
    flagshipProjects: ['Cavalli Residences', 'DAMAC Lagoons', 'Akoya Oxygen'],
    activeProjects: ['DMC-001', 'DMC-002', 'DMC-003'],
    completedProjects: ['Cavalli Residences', 'DAMAC Maison', 'Damac Crest'],
    specialization: ['Luxury', 'Celebrity collaborations', 'Mixed-use'],
    avgPriceSqft: 2400,
    priceRange: { min: 1200000, max: 8500000 },
    marketSharePct: 14,
    trend: 'stable',
    recentLaunches: [
      { name: 'Safa Two', date: '2025-04-10', area: 'Business Bay' },
      { name: 'Cavalli Tower Expansion', date: '2024-11-20', area: 'Dubai Marina' }
    ],
    escrowCompliance: 'Full',
    financialStability: 'Stable'
  },
  {
    id: 'MRS',
    name: 'Meraas',
    shortName: 'MRS',
    established: 2004,
    headquarters: 'Downtown Dubai',
    totalProjectsDelivered: 30,
    totalProjectsActive: 12,
    totalUnitsDelivered: 18000,
    avgCompletionDelay: -1,
    onTimeDeliveryPct: 82,
    qualityRating: 4.7,
    customerSatisfaction: 85,
    reraRating: 'A',
    flagshipProjects: ['City Walk', 'Bluewaters', 'La Mer'],
    activeProjects: ['MRS-001', 'MRS-002', 'MRS-003'],
    completedProjects: ['City Walk Phase I-II', 'Bluewaters Island', 'La Mer Residences'],
    specialization: ['Boutique luxury', 'Lifestyle communities', 'Waterfront'],
    avgPriceSqft: 2800,
    priceRange: { min: 1800000, max: 6500000 },
    marketSharePct: 8,
    trend: 'growing',
    recentLaunches: [
      { name: 'Bluewaters Residences II', date: '2025-05-01', area: 'Jumeirah Beach Residence' },
      { name: 'City Walk Phase III', date: '2025-01-15', area: 'Downtown' }
    ],
    escrowCompliance: 'Full',
    financialStability: 'Strong'
  },
  {
    id: 'SBH',
    name: 'Sobha Realty',
    shortName: 'SBH',
    established: 1992,
    headquarters: 'Dubai Hills Estate',
    totalProjectsDelivered: 20,
    totalProjectsActive: 14,
    totalUnitsDelivered: 12000,
    avgCompletionDelay: -3,
    onTimeDeliveryPct: 85,
    qualityRating: 4.6,
    customerSatisfaction: 86,
    reraRating: 'A',
    flagshipProjects: ['Sobha Hartland', 'SeaHaven', 'Siniya Island'],
    activeProjects: ['SBH-001', 'SBH-002', 'SBH-003'],
    completedProjects: ['Sobha Hartland Phase I', 'SeaHaven Phase I', 'Sobha Reserve'],
    specialization: ['Premium gated communities', 'Waterfront luxury', 'Family-oriented'],
    avgPriceSqft: 2950,
    priceRange: { min: 2000000, max: 7500000 },
    marketSharePct: 7,
    trend: 'growing',
    recentLaunches: [
      { name: 'Hartland III', date: '2025-02-20', area: 'MBR City' },
      { name: 'SeaHaven Waterfront', date: '2024-12-01', area: 'Dubai Marina' }
    ],
    escrowCompliance: 'Full',
    financialStability: 'Strong'
  },
  {
    id: 'NKL',
    name: 'Nakheel',
    shortName: 'NKL',
    established: 2000,
    headquarters: 'Palm Jumeirah',
    totalProjectsDelivered: 60,
    totalProjectsActive: 16,
    totalUnitsDelivered: 42000,
    avgCompletionDelay: 2,
    onTimeDeliveryPct: 70,
    qualityRating: 4.2,
    customerSatisfaction: 79,
    reraRating: 'A+',
    flagshipProjects: ['Palm Jumeirah', 'The World', 'JBR', 'Arabian Ranches'],
    activeProjects: ['NKL-001', 'NKL-002', 'NKL-003', 'NKL-004'],
    completedProjects: ['Palm Jumeirah Phase I-III', 'JBR', 'Arabian Ranches Phase I-II'],
    specialization: ['Master-planned communities', 'Iconic waterfront', 'Government-backed'],
    avgPriceSqft: 2100,
    priceRange: { min: 800000, max: 12000000 },
    marketSharePct: 12,
    trend: 'stable',
    recentLaunches: [
      { name: 'Palm Beach Towers IV', date: '2025-03-25', area: 'Palm Jumeirah' },
      { name: 'Dragon Towers', date: '2025-04-15', area: 'Dubai South' }
    ],
    escrowCompliance: 'Full',
    financialStability: 'Strong'
  },
  {
    id: 'DPR',
    name: 'Dubai Properties',
    shortName: 'DPR',
    established: 2006,
    headquarters: 'Business Bay',
    totalProjectsDelivered: 40,
    totalProjectsActive: 11,
    totalUnitsDelivered: 22000,
    avgCompletionDelay: 5,
    onTimeDeliveryPct: 60,
    qualityRating: 3.5,
    customerSatisfaction: 72,
    reraRating: 'B+',
    flagshipProjects: ['Bellevue Towers', 'Villanova', 'Lakeside'],
    activeProjects: ['DPR-001', 'DPR-002', 'DPR-003'],
    completedProjects: ['Bellevue Towers I', 'Villanova Phase I-IV', 'Lakeside Residences'],
    specialization: ['Mid-market', 'Good value', 'Family apartments'],
    avgPriceSqft: 1700,
    priceRange: { min: 900000, max: 3500000 },
    marketSharePct: 6,
    trend: 'stable',
    recentLaunches: [
      { name: 'Villanova Phase V', date: '2025-05-10', area: 'Dubai South' },
      { name: 'Bellevue Towers II', date: '2025-03-01', area: 'Downtown' }
    ],
    escrowCompliance: 'Full',
    financialStability: 'Stable'
  },
  {
    id: 'AZZ',
    name: 'Azizi Developments',
    shortName: 'AZZ',
    established: 2007,
    headquarters: 'Dubai South',
    totalProjectsDelivered: 25,
    totalProjectsActive: 13,
    totalUnitsDelivered: 15000,
    avgCompletionDelay: 6,
    onTimeDeliveryPct: 55,
    qualityRating: 3.3,
    customerSatisfaction: 70,
    reraRating: 'B',
    flagshipProjects: ['Riviera', 'Creek Views', 'Mina Heights'],
    activeProjects: ['AZZ-001', 'AZZ-002', 'AZZ-003', 'AZZ-004'],
    completedProjects: ['Riviera Phase I-III', 'Creek Views Phase I-II', 'Mina Heights'],
    specialization: ['Affordable luxury', 'Volume builder', 'Mixed-use communities'],
    avgPriceSqft: 1450,
    priceRange: { min: 650000, max: 2800000 },
    marketSharePct: 5,
    trend: 'declining',
    recentLaunches: [
      { name: 'Riviera Phase IV', date: '2025-06-01', area: 'MBR City' },
      { name: 'Creek Views III', date: '2025-04-20', area: 'Business Bay' }
    ],
    escrowCompliance: 'Partial',
    financialStability: 'Stable'
  },
  {
    id: 'OMN',
    name: 'Omniyat',
    shortName: 'OMN',
    established: 2012,
    headquarters: 'Business Bay',
    totalProjectsDelivered: 10,
    totalProjectsActive: 8,
    totalUnitsDelivered: 2500,
    avgCompletionDelay: 1,
    onTimeDeliveryPct: 75,
    qualityRating: 4.8,
    customerSatisfaction: 88,
    reraRating: 'A',
    flagshipProjects: ['The Opus', 'Alba', 'Aether'],
    activeProjects: ['OMN-001', 'OMN-002', 'OMN-003'],
    completedProjects: ['The Opus', 'Aether Residences'],
    specialization: ['Ultra-luxury boutique', 'Architectural excellence', 'Limited editions'],
    avgPriceSqft: 4100,
    priceRange: { min: 3500000, max: 18000000 },
    marketSharePct: 3,
    trend: 'growing',
    recentLaunches: [
      { name: 'The Opus Residences', date: '2025-02-10', area: 'Business Bay' },
      { name: 'Alba Residences', date: '2024-10-15', area: 'Palm Jumeirah' }
    ],
    escrowCompliance: 'Full',
    financialStability: 'Strong'
  }
]

// Off-Plan Projects Data
export const offPlanProjects: OffPlanProject[] = [
  {
    id: 'EMR-001',
    projectName: 'Coral Reef',
    developer: 'Emaar Properties',
    developerId: 'EMR',
    area: 'Palm Jumeirah',
    areaId: 'PLM',
    subArea: 'Frond A',
    status: 'Announced',
    launchDate: '2025-07-01',
    estimatedCompletion: '2028-Q4',
    completionPct: 5,
    totalUnits: 220,
    soldUnits: 8,
    availableUnits: 212,
    soldPct: 3.6,
    propertyTypes: ['2BR', '3BR', '4BR', 'Penthouse'],
    priceFrom: 3100000,
    priceTo: 8500000,
    avgPriceSqft: 3850,
    sizeFrom: 1250,
    sizeTo: 3500,
    paymentPlan: {
      name: '80/20 post-handover',
      downPayment: 20,
      duringConstruction: 80,
      onHandover: 0,
      postHandover: 0,
      installments: [
        { milestone: 'Booking', percentage: 20, estimatedDate: '2025-07-15' },
        { milestone: '25% Construction', percentage: 15, estimatedDate: '2026-02-01' },
        { milestone: '50% Construction', percentage: 15, estimatedDate: '2026-08-01' },
        { milestone: '75% Construction', percentage: 15, estimatedDate: '2027-02-01' },
        { milestone: '90% Construction', percentage: 15, estimatedDate: '2028-02-01' },
        { milestone: 'Handover', percentage: 20, estimatedDate: '2028-12-15' }
      ]
    },
    escrowAccount: 'RERA-EMR-PLM-2025-001',
    reraNumber: 'OFF-2025-013847',
    serviceChargeEstimate: 35,
    amenities: ['Private beach', 'Infinity pools', 'Spa', 'Marina access', 'Concierge', 'Smart home integration'],
    usp: 'Exclusive Palm Jumeirah waterfront with private beach access and ultra-luxury amenities',
    areaAvgPriceSqft: 3500,
    priceVsAreaAvg: 10,
    demandScore: 92,
    investorAppeal: 'High',
    rentalYieldEstimate: 5.2,
    capitalGrowthEstimate: 8.5,
    unitMix: [
      { type: '2BR', count: 65, sizeRange: '1250-1450 sqft', priceFrom: 3100000, priceTo: 4200000, avgPriceSqft: 3100, soldPct: 5, availableCount: 62 },
      { type: '3BR', count: 95, sizeRange: '1800-2100 sqft', priceFrom: 4500000, priceTo: 6100000, avgPriceSqft: 3600, soldPct: 3, availableCount: 92 },
      { type: '4BR', count: 45, sizeRange: '2800-3200 sqft', priceFrom: 6800000, priceTo: 8200000, avgPriceSqft: 4200, soldPct: 2, availableCount: 44 },
      { type: 'Penthouse', count: 15, sizeRange: '3200-3500 sqft', priceFrom: 8000000, priceTo: 8500000, avgPriceSqft: 4600, soldPct: 20, availableCount: 12 }
    ],
    salesVelocity: 0.5,
    lastSaleDate: '2025-06-20',
    priceHistory: [3400, 3420, 3450, 3480, 3520, 3580, 3620, 3680, 3750, 3800, 3840, 3850]
  },
  {
    id: 'EMR-002',
    projectName: 'The Pinnacle',
    developer: 'Emaar Properties',
    developerId: 'EMR',
    area: 'Downtown Dubai',
    areaId: 'DTN',
    status: 'Launched',
    launchDate: '2025-01-15',
    estimatedCompletion: '2027-Q3',
    completionPct: 18,
    totalUnits: 380,
    soldUnits: 142,
    availableUnits: 238,
    soldPct: 37.4,
    propertyTypes: ['1BR', '2BR', '3BR', 'Penthouse'],
    priceFrom: 1800000,
    priceTo: 6500000,
    avgPriceSqft: 3200,
    sizeFrom: 650,
    sizeTo: 2800,
    paymentPlan: {
      name: '60/40',
      downPayment: 30,
      duringConstruction: 30,
      onHandover: 40,
      postHandover: 0,
      installments: [
        { milestone: 'Booking', percentage: 30, estimatedDate: '2025-02-01' },
        { milestone: '30% Construction', percentage: 10, estimatedDate: '2025-09-01' },
        { milestone: '50% Construction', percentage: 10, estimatedDate: '2026-03-01' },
        { milestone: '75% Construction', percentage: 10, estimatedDate: '2026-09-01' },
        { milestone: 'Handover', percentage: 40, estimatedDate: '2027-09-15' }
      ]
    },
    escrowAccount: 'RERA-EMR-DTN-2025-002',
    reraNumber: 'OFF-2025-013848',
    serviceChargeEstimate: 32,
    amenities: ['5-star hotel', 'Michelin restaurants', 'Private cinema', 'Wellness center', 'Rooftop lounge', 'Smart building'],
    usp: 'Downtown\'s tallest mixed-use icon with integrated hospitality and premium retail',
    areaAvgPriceSqft: 3100,
    priceVsAreaAvg: 3,
    demandScore: 88,
    investorAppeal: 'High',
    rentalYieldEstimate: 4.8,
    capitalGrowthEstimate: 7.2,
    unitMix: [
      { type: '1BR', count: 85, sizeRange: '650-850 sqft', priceFrom: 1800000, priceTo: 2400000, avgPriceSqft: 2800, soldPct: 40, availableCount: 51 },
      { type: '2BR', count: 140, sizeRange: '1150-1450 sqft', priceFrom: 2600000, priceTo: 3800000, avgPriceSqft: 3200, soldPct: 35, availableCount: 91 },
      { type: '3BR', count: 120, sizeRange: '1800-2200 sqft', priceFrom: 4200000, priceTo: 5600000, avgPriceSqft: 3600, soldPct: 38, availableCount: 74 },
      { type: 'Penthouse', count: 35, sizeRange: '2400-2800 sqft', priceFrom: 5800000, priceTo: 6500000, avgPriceSqft: 4100, soldPct: 40, availableCount: 21 }
    ],
    salesVelocity: 3.5,
    lastSaleDate: '2025-06-18',
    priceHistory: [2950, 2980, 3015, 3050, 3090, 3130, 3170, 3190, 3210, 3220, 3215, 3200]
  },
  {
    id: 'EMR-003',
    projectName: 'Park Heights III',
    developer: 'Emaar Properties',
    developerId: 'EMR',
    area: 'Dubai Hills Estate',
    areaId: 'DHL',
    status: 'Under Construction',
    launchDate: '2023-11-20',
    estimatedCompletion: '2026-Q2',
    completionPct: 52,
    totalUnits: 250,
    soldUnits: 210,
    availableUnits: 40,
    soldPct: 84,
    propertyTypes: ['2BR', '3BR', '4BR', 'Villa'],
    priceFrom: 1350000,
    priceTo: 3200000,
    avgPriceSqft: 1900,
    sizeFrom: 1100,
    sizeTo: 2400,
    paymentPlan: {
      name: '50/50',
      downPayment: 25,
      duringConstruction: 25,
      onHandover: 50,
      postHandover: 0,
      installments: [
        { milestone: 'Booking', percentage: 25, estimatedDate: '2023-12-15' },
        { milestone: '40% Construction', percentage: 25, estimatedDate: '2024-10-01' },
        { milestone: 'Handover', percentage: 50, estimatedDate: '2026-06-15' }
      ]
    },
    escrowAccount: 'RERA-EMR-DHL-2023-001',
    reraNumber: 'OFF-2023-008924',
    serviceChargeEstimate: 28,
    amenities: ['Golf views', 'Parks', 'Fitness center', 'Kids playground', 'Community center', 'Security gates'],
    usp: 'Premium gated community with championship golf course and family-friendly amenities',
    areaAvgPriceSqft: 1750,
    priceVsAreaAvg: 8,
    demandScore: 85,
    investorAppeal: 'High',
    rentalYieldEstimate: 5.5,
    capitalGrowthEstimate: 6.8,
    unitMix: [
      { type: '2BR', count: 95, sizeRange: '1100-1350 sqft', priceFrom: 1350000, priceTo: 1850000, avgPriceSqft: 1650, soldPct: 88, availableCount: 11 },
      { type: '3BR', count: 110, sizeRange: '1600-2000 sqft', priceFrom: 2100000, priceTo: 2800000, avgPriceSqft: 1900, soldPct: 82, availableCount: 20 },
      { type: '4BR', count: 35, sizeRange: '2100-2400 sqft', priceFrom: 2900000, priceTo: 3200000, avgPriceSqft: 2200, soldPct: 80, availableCount: 7 },
      { type: 'Villa', count: 10, sizeRange: '2200-2600 sqft', priceFrom: 3100000, priceTo: 3600000, avgPriceSqft: 2400, soldPct: 90, availableCount: 1 }
    ],
    salesVelocity: 2.8,
    lastSaleDate: '2025-06-15',
    priceHistory: [1650, 1670, 1690, 1720, 1750, 1780, 1810, 1840, 1870, 1890, 1895, 1900]
  },
  {
    id: 'EMR-004',
    projectName: 'Marina Skyline',
    developer: 'Emaar Properties',
    developerId: 'EMR',
    area: 'Dubai Marina',
    areaId: 'MRN',
    status: 'Under Construction',
    launchDate: '2024-02-01',
    estimatedCompletion: '2027-Q1',
    completionPct: 35,
    totalUnits: 320,
    soldUnits: 108,
    availableUnits: 212,
    soldPct: 33.8,
    propertyTypes: ['1BR', '2BR', '3BR', 'Penthouse'],
    priceFrom: 1650000,
    priceTo: 5200000,
    avgPriceSqft: 2600,
    sizeFrom: 700,
    sizeTo: 2500,
    paymentPlan: {
      name: '70/30',
      downPayment: 25,
      duringConstruction: 45,
      onHandover: 30,
      postHandover: 0,
      installments: [
        { milestone: 'Booking', percentage: 25, estimatedDate: '2024-02-15' },
        { milestone: '25% Construction', percentage: 15, estimatedDate: '2024-09-01' },
        { milestone: '50% Construction', percentage: 15, estimatedDate: '2025-03-01' },
        { milestone: '75% Construction', percentage: 15, estimatedDate: '2025-09-01' },
        { milestone: 'Handover', percentage: 30, estimatedDate: '2027-03-15' }
      ]
    },
    escrowAccount: 'RERA-EMR-MRN-2024-001',
    reraNumber: 'OFF-2024-010521',
    serviceChargeEstimate: 30,
    amenities: ['Marina views', 'Yacht access', 'Waterfront promenade', 'Fine dining', 'Beach club', 'Rooftop pool'],
    usp: 'Marina waterfront luxury with direct yacht access and world-class dining',
    areaAvgPriceSqft: 2400,
    priceVsAreaAvg: 8,
    demandScore: 86,
    investorAppeal: 'High',
    rentalYieldEstimate: 4.5,
    capitalGrowthEstimate: 6.5,
    unitMix: [
      { type: '1BR', count: 75, sizeRange: '700-900 sqft', priceFrom: 1650000, priceTo: 2300000, avgPriceSqft: 2300, soldPct: 35, availableCount: 49 },
      { type: '2BR', count: 125, sizeRange: '1200-1500 sqft', priceFrom: 2600000, priceTo: 3600000, avgPriceSqft: 2700, soldPct: 32, availableCount: 85 },
      { type: '3BR', count: 95, sizeRange: '1800-2200 sqft', priceFrom: 3800000, priceTo: 4800000, avgPriceSqft: 3100, soldPct: 34, availableCount: 63 },
      { type: 'Penthouse', count: 25, sizeRange: '2200-2500 sqft', priceFrom: 4900000, priceTo: 5200000, avgPriceSqft: 3500, soldPct: 32, availableCount: 17 }
    ],
    salesVelocity: 2.2,
    lastSaleDate: '2025-06-22',
    priceHistory: [2350, 2380, 2415, 2450, 2490, 2530, 2570, 2595, 2615, 2625, 2620, 2600]
  },
  {
    id: 'EMR-005',
    projectName: 'Creek Horizons',
    developer: 'Emaar Properties',
    developerId: 'EMR',
    area: 'MBR City',
    areaId: 'MBR',
    status: 'Near Completion',
    launchDate: '2022-05-10',
    estimatedCompletion: '2025-Q4',
    completionPct: 88,
    totalUnits: 410,
    soldUnits: 385,
    availableUnits: 25,
    soldPct: 93.9,
    propertyTypes: ['Studio', '1BR', '2BR', '3BR'],
    priceFrom: 850000,
    priceTo: 2800000,
    avgPriceSqft: 1850,
    sizeFrom: 450,
    sizeTo: 1800,
    paymentPlan: {
      name: '40/60 post-handover',
      downPayment: 20,
      duringConstruction: 20,
      onHandover: 60,
      postHandover: 0,
      installments: [
        { milestone: 'Booking', percentage: 20, estimatedDate: '2022-06-01' },
        { milestone: '50% Construction', percentage: 20, estimatedDate: '2023-11-01' },
        { milestone: 'Handover', percentage: 60, estimatedDate: '2025-12-15' }
      ]
    },
    escrowAccount: 'RERA-EMR-MBR-2022-001',
    reraNumber: 'OFF-2022-005421',
    serviceChargeEstimate: 26,
    amenities: ['Creek views', 'Parks', 'Retail center', 'Family zones', 'Gym', 'Kids play areas'],
    usp: 'Developed creek-side community with family apartments and integrated retail',
    areaAvgPriceSqft: 1600,
    priceVsAreaAvg: 15,
    demandScore: 82,
    investorAppeal: 'Medium',
    rentalYieldEstimate: 5.8,
    capitalGrowthEstimate: 5.2,
    unitMix: [
      { type: 'Studio', count: 85, sizeRange: '450-550 sqft', priceFrom: 850000, priceTo: 1150000, avgPriceSqft: 1600, soldPct: 95, availableCount: 4 },
      { type: '1BR', count: 150, sizeRange: '650-850 sqft', priceFrom: 1250000, priceTo: 1650000, avgPriceSqft: 1750, soldPct: 93, availableCount: 10 },
      { type: '2BR', count: 130, sizeRange: '1100-1400 sqft', priceFrom: 1750000, priceTo: 2350000, avgPriceSqft: 1850, soldPct: 94, availableCount: 8 },
      { type: '3BR', count: 45, sizeRange: '1600-1800 sqft', priceFrom: 2500000, priceTo: 2800000, avgPriceSqft: 2000, soldPct: 93, availableCount: 3 }
    ],
    salesVelocity: 4.2,
    lastSaleDate: '2025-06-25',
    priceHistory: [1550, 1590, 1630, 1680, 1720, 1760, 1800, 1825, 1845, 1850, 1855, 1850]
  },
  {
    id: 'DMC-001',
    projectName: 'Cavalli Tower',
    developer: 'DAMAC Properties',
    developerId: 'DMC',
    area: 'Dubai Marina',
    areaId: 'MRN',
    status: 'Launched',
    launchDate: '2024-08-15',
    estimatedCompletion: '2027-Q2',
    completionPct: 22,
    totalUnits: 180,
    soldUnits: 45,
    availableUnits: 135,
    soldPct: 25,
    propertyTypes: ['1BR', '2BR', '3BR', 'Penthouse'],
    priceFrom: 2150000,
    priceTo: 6800000,
    avgPriceSqft: 2850,
    sizeFrom: 850,
    sizeTo: 2800,
    paymentPlan: {
      name: '70/30',
      downPayment: 30,
      duringConstruction: 40,
      onHandover: 30,
      postHandover: 0,
      installments: [
        { milestone: 'Booking', percentage: 30, estimatedDate: '2024-09-01' },
        { milestone: '30% Construction', percentage: 13, estimatedDate: '2025-03-01' },
        { milestone: '60% Construction', percentage: 14, estimatedDate: '2025-09-01' },
        { milestone: '90% Construction', percentage: 13, estimatedDate: '2026-03-01' },
        { milestone: 'Handover', percentage: 30, estimatedDate: '2027-06-15' }
      ]
    },
    escrowAccount: 'RERA-DMC-MRN-2024-001',
    reraNumber: 'OFF-2024-010545',
    serviceChargeEstimate: 33,
    amenities: ['Signature living', 'Marina views', 'High-end spa', 'Celebrity collaborations', 'Rooftop lounge', 'Concierge'],
    usp: 'Celebrity designer collaboration with iconic Marina views and luxury signature living',
    areaAvgPriceSqft: 2400,
    priceVsAreaAvg: 18,
    demandScore: 84,
    investorAppeal: 'High',
    rentalYieldEstimate: 4.2,
    capitalGrowthEstimate: 7.5,
    unitMix: [
      { type: '1BR', count: 45, sizeRange: '850-1050 sqft', priceFrom: 2150000, priceTo: 2750000, avgPriceSqft: 2500, soldPct: 28, availableCount: 32 },
      { type: '2BR', count: 70, sizeRange: '1350-1650 sqft', priceFrom: 3200000, priceTo: 4200000, avgPriceSqft: 2800, soldPct: 24, availableCount: 53 },
      { type: '3BR', count: 50, sizeRange: '2000-2400 sqft', priceFrom: 4600000, priceTo: 5800000, avgPriceSqft: 3100, soldPct: 22, availableCount: 39 },
      { type: 'Penthouse', count: 15, sizeRange: '2600-2800 sqft', priceFrom: 6000000, priceTo: 6800000, avgPriceSqft: 3800, soldPct: 27, availableCount: 11 }
    ],
    salesVelocity: 1.4,
    lastSaleDate: '2025-06-21',
    priceHistory: [2550, 2580, 2620, 2660, 2700, 2750, 2800, 2835, 2855, 2860, 2855, 2850]
  },
  {
    id: 'DMC-002',
    projectName: 'Safa Two',
    developer: 'DAMAC Properties',
    developerId: 'DMC',
    area: 'Business Bay',
    areaId: 'BBY',
    status: 'Announced',
    launchDate: '2025-04-10',
    estimatedCompletion: '2028-Q1',
    completionPct: 2,
    totalUnits: 340,
    soldUnits: 6,
    availableUnits: 334,
    soldPct: 1.8,
    propertyTypes: ['1BR', '2BR', '3BR', 'Penthouse'],
    priceFrom: 1550000,
    priceTo: 4200000,
    avgPriceSqft: 2100,
    sizeFrom: 700,
    sizeTo: 2300,
    paymentPlan: {
      name: '80/20 post-handover',
      downPayment: 20,
      duringConstruction: 80,
      onHandover: 0,
      postHandover: 0,
      installments: [
        { milestone: 'Booking', percentage: 20, estimatedDate: '2025-04-20' },
        { milestone: '25% Construction', percentage: 15, estimatedDate: '2025-12-01' },
        { milestone: '50% Construction', percentage: 15, estimatedDate: '2026-06-01' },
        { milestone: '75% Construction', percentage: 15, estimatedDate: '2027-01-01' },
        { milestone: '90% Construction', percentage: 15, estimatedDate: '2027-09-01' },
        { milestone: 'Handover', percentage: 20, estimatedDate: '2028-03-15' }
      ]
    },
    escrowAccount: 'RERA-DMC-BBY-2025-002',
    reraNumber: 'OFF-2025-013921',
    serviceChargeEstimate: 28,
    amenities: ['Business hub', 'Co-working spaces', 'Retail district', 'Fine dining', 'Wellness center', 'Smart offices'],
    usp: 'Prime Business Bay location with integrated business amenities and retail excellence',
    areaAvgPriceSqft: 1900,
    priceVsAreaAvg: 10,
    demandScore: 78,
    investorAppeal: 'Medium',
    rentalYieldEstimate: 5.2,
    capitalGrowthEstimate: 5.8,
    unitMix: [
      { type: '1BR', count: 120, sizeRange: '700-900 sqft', priceFrom: 1550000, priceTo: 2050000, avgPriceSqft: 1850, soldPct: 2, availableCount: 118 },
      { type: '2BR', count: 140, sizeRange: '1100-1400 sqft', priceFrom: 2250000, priceTo: 3000000, avgPriceSqft: 2100, soldPct: 2, availableCount: 137 },
      { type: '3BR', count: 70, sizeRange: '1700-2000 sqft', priceFrom: 3200000, priceTo: 3900000, avgPriceSqft: 2400, soldPct: 1, availableCount: 69 },
      { type: 'Penthouse', count: 10, sizeRange: '2100-2300 sqft', priceFrom: 4000000, priceTo: 4200000, avgPriceSqft: 2900, soldPct: 0, availableCount: 10 }
    ],
    salesVelocity: 0.2,
    lastSaleDate: '2025-05-30',
    priceHistory: [2100, 2105, 2110, 2115, 2115, 2120, 2120, 2125, 2125, 2130, 2130, 2100]
  },
  {
    id: 'DMC-003',
    projectName: 'Lagoon Views',
    developer: 'DAMAC Properties',
    developerId: 'DMC',
    area: 'Dubai South',
    areaId: 'DST',
    status: 'Under Construction',
    launchDate: '2023-07-01',
    estimatedCompletion: '2026-Q3',
    completionPct: 48,
    totalUnits: 560,
    soldUnits: 280,
    availableUnits: 280,
    soldPct: 50,
    propertyTypes: ['Studio', '1BR', '2BR', '3BR'],
    priceFrom: 650000,
    priceTo: 2200000,
    avgPriceSqft: 1150,
    sizeFrom: 400,
    sizeTo: 1600,
    paymentPlan: {
      name: '50/50',
      downPayment: 20,
      duringConstruction: 30,
      onHandover: 50,
      postHandover: 0,
      installments: [
        { milestone: 'Booking', percentage: 20, estimatedDate: '2023-08-01' },
        { milestone: '40% Construction', percentage: 30, estimatedDate: '2024-07-01' },
        { milestone: 'Handover', percentage: 50, estimatedDate: '2026-09-15' }
      ]
    },
    escrowAccount: 'RERA-DMC-DST-2023-001',
    reraNumber: 'OFF-2023-009102',
    serviceChargeEstimate: 22,
    amenities: ['Lagoon views', 'Beach access', 'Parks', 'Shopping mall', 'Community center', 'Sports facilities'],
    usp: 'Affordable luxury on Dubai South lagoon with integrated shopping and recreation',
    areaAvgPriceSqft: 950,
    priceVsAreaAvg: 20,
    demandScore: 76,
    investorAppeal: 'Medium',
    rentalYieldEstimate: 6.2,
    capitalGrowthEstimate: 5.5,
    unitMix: [
      { type: 'Studio', count: 145, sizeRange: '400-500 sqft', priceFrom: 650000, priceTo: 850000, avgPriceSqft: 1100, soldPct: 52, availableCount: 70 },
      { type: '1BR', count: 210, sizeRange: '600-800 sqft', priceFrom: 950000, priceTo: 1300000, avgPriceSqft: 1150, soldPct: 50, availableCount: 105 },
      { type: '2BR', count: 155, sizeRange: '1000-1300 sqft', priceFrom: 1450000, priceTo: 1850000, avgPriceSqft: 1200, soldPct: 48, availableCount: 81 },
      { type: '3BR', count: 50, sizeRange: '1400-1600 sqft', priceFrom: 1950000, priceTo: 2200000, avgPriceSqft: 1350, soldPct: 50, availableCount: 24 }
    ],
    salesVelocity: 3.8,
    lastSaleDate: '2025-06-24',
    priceHistory: [1050, 1070, 1090, 1120, 1145, 1165, 1180, 1190, 1200, 1210, 1220, 1150]
  },
  {
    id: 'MRS-001',
    projectName: 'Bluewaters Residences II',
    developer: 'Meraas',
    developerId: 'MRS',
    area: 'Jumeirah Beach Residence',
    areaId: 'JBR',
    status: 'Launched',
    launchDate: '2025-05-01',
    estimatedCompletion: '2028-Q2',
    completionPct: 8,
    totalUnits: 290,
    soldUnits: 52,
    availableUnits: 238,
    soldPct: 17.9,
    propertyTypes: ['1BR', '2BR', '3BR', 'Penthouse'],
    priceFrom: 1800000,
    priceTo: 5500000,
    avgPriceSqft: 2650,
    sizeFrom: 750,
    sizeTo: 2600,
    paymentPlan: {
      name: '75/25',
      downPayment: 25,
      duringConstruction: 50,
      onHandover: 25,
      postHandover: 0,
      installments: [
        { milestone: 'Booking', percentage: 25, estimatedDate: '2025-05-15' },
        { milestone: '25% Construction', percentage: 17, estimatedDate: '2025-11-01' },
        { milestone: '50% Construction', percentage: 16, estimatedDate: '2026-05-01' },
        { milestone: '75% Construction', percentage: 17, estimatedDate: '2026-11-01' },
        { milestone: 'Handover', percentage: 25, estimatedDate: '2028-06-15' }
      ]
    },
    escrowAccount: 'RERA-MRS-JBR-2025-001',
    reraNumber: 'OFF-2025-013945',
    serviceChargeEstimate: 31,
    amenities: ['Beach access', 'Lagoon promenade', 'Lifestyle retail', 'Restaurants', 'Beach club', 'Water sports'],
    usp: 'Prime Bluewaters waterfront lifestyle with beach access and curated experiences',
    areaAvgPriceSqft: 2300,
    priceVsAreaAvg: 15,
    demandScore: 87,
    investorAppeal: 'High',
    rentalYieldEstimate: 4.8,
    capitalGrowthEstimate: 7.2,
    unitMix: [
      { type: '1BR', count: 80, sizeRange: '750-950 sqft', priceFrom: 1800000, priceTo: 2400000, avgPriceSqft: 2400, soldPct: 20, availableCount: 64 },
      { type: '2BR', count: 110, sizeRange: '1250-1550 sqft', priceFrom: 2700000, priceTo: 3600000, avgPriceSqft: 2750, soldPct: 18, availableCount: 90 },
      { type: '3BR', count: 75, sizeRange: '1800-2200 sqft', priceFrom: 3900000, priceTo: 5000000, avgPriceSqft: 3150, soldPct: 16, availableCount: 63 },
      { type: 'Penthouse', count: 25, sizeRange: '2300-2600 sqft', priceFrom: 5200000, priceTo: 5500000, avgPriceSqft: 3600, soldPct: 20, availableCount: 20 }
    ],
    salesVelocity: 1.8,
    lastSaleDate: '2025-06-20',
    priceHistory: [2550, 2580, 2610, 2640, 2665, 2690, 2710, 2730, 2745, 2755, 2755, 2650]
  },
  {
    id: 'MRS-002',
    projectName: 'City Walk Phase III',
    developer: 'Meraas',
    developerId: 'MRS',
    area: 'Downtown Dubai',
    areaId: 'DTN',
    status: 'Launched',
    launchDate: '2025-01-15',
    estimatedCompletion: '2026-Q4',
    completionPct: 28,
    totalUnits: 185,
    soldUnits: 66,
    availableUnits: 119,
    soldPct: 35.7,
    propertyTypes: ['1BR', '2BR', '3BR'],
    priceFrom: 1400000,
    priceTo: 3800000,
    avgPriceSqft: 2450,
    sizeFrom: 600,
    sizeTo: 1900,
    paymentPlan: {
      name: '60/40',
      downPayment: 30,
      duringConstruction: 30,
      onHandover: 40,
      postHandover: 0,
      installments: [
        { milestone: 'Booking', percentage: 30, estimatedDate: '2025-02-01' },
        { milestone: '40% Construction', percentage: 15, estimatedDate: '2025-06-01' },
        { milestone: '70% Construction', percentage: 15, estimatedDate: '2025-12-01' },
        { milestone: 'Handover', percentage: 40, estimatedDate: '2026-12-15' }
      ]
    },
    escrowAccount: 'RERA-MRS-DTN-2025-002',
    reraNumber: 'OFF-2025-013952',
    serviceChargeEstimate: 29,
    amenities: ['Retail district', 'Restaurants & cafes', 'Kids play zone', 'Outdoor cinema', 'Green spaces', 'Fitness'],
    usp: 'Urban lifestyle community with retail, dining, and entertainment within walking distance',
    areaAvgPriceSqft: 3100,
    priceVsAreaAvg: -21,
    demandScore: 80,
    investorAppeal: 'Medium',
    rentalYieldEstimate: 5.1,
    capitalGrowthEstimate: 5.9,
    unitMix: [
      { type: '1BR', count: 70, sizeRange: '600-800 sqft', priceFrom: 1400000, priceTo: 1900000, avgPriceSqft: 2200, soldPct: 38, availableCount: 43 },
      { type: '2BR', count: 85, sizeRange: '1000-1350 sqft', priceFrom: 2100000, priceTo: 2900000, avgPriceSqft: 2450, soldPct: 35, availableCount: 55 },
      { type: '3BR', count: 30, sizeRange: '1600-1900 sqft', priceFrom: 3100000, priceTo: 3800000, avgPriceSqft: 2800, soldPct: 33, availableCount: 21 }
    ],
    salesVelocity: 1.6,
    lastSaleDate: '2025-06-19',
    priceHistory: [2250, 2280, 2320, 2360, 2400, 2440, 2475, 2495, 2515, 2525, 2520, 2450]
  },
  {
    id: 'SBH-001',
    projectName: 'Hartland III',
    developer: 'Sobha Realty',
    developerId: 'SBH',
    area: 'MBR City',
    areaId: 'MBR',
    status: 'Launched',
    launchDate: '2025-02-20',
    estimatedCompletion: '2027-Q4',
    completionPct: 15,
    totalUnits: 220,
    soldUnits: 44,
    availableUnits: 176,
    soldPct: 20,
    propertyTypes: ['2BR', '3BR', '4BR', 'Penthouse'],
    priceFrom: 1550000,
    priceTo: 3800000,
    avgPriceSqft: 1950,
    sizeFrom: 1100,
    sizeTo: 2500,
    paymentPlan: {
      name: '65/35',
      downPayment: 25,
      duringConstruction: 40,
      onHandover: 35,
      postHandover: 0,
      installments: [
        { milestone: 'Booking', percentage: 25, estimatedDate: '2025-03-10' },
        { milestone: '30% Construction', percentage: 13, estimatedDate: '2025-09-01' },
        { milestone: '60% Construction', percentage: 14, estimatedDate: '2026-03-01' },
        { milestone: '85% Construction', percentage: 13, estimatedDate: '2026-09-01' },
        { milestone: 'Handover', percentage: 35, estimatedDate: '2027-12-15' }
      ]
    },
    escrowAccount: 'RERA-SBH-MBR-2025-001',
    reraNumber: 'OFF-2025-013968',
    serviceChargeEstimate: 27,
    amenities: ['Gated community', 'Creek promenade', 'Parks', 'Community center', 'Wellness zone', 'Kids facilities'],
    usp: 'Premium gated community by award-winning developer with creek-side living',
    areaAvgPriceSqft: 1600,
    priceVsAreaAvg: 22,
    demandScore: 84,
    investorAppeal: 'High',
    rentalYieldEstimate: 5.6,
    capitalGrowthEstimate: 6.8,
    unitMix: [
      { type: '2BR', count: 95, sizeRange: '1100-1350 sqft', priceFrom: 1550000, priceTo: 2100000, avgPriceSqft: 1750, soldPct: 22, availableCount: 74 },
      { type: '3BR', count: 85, sizeRange: '1500-1850 sqft', priceFrom: 2250000, priceTo: 2950000, avgPriceSqft: 1950, soldPct: 19, availableCount: 69 },
      { type: '4BR', count: 35, sizeRange: '2000-2300 sqft', priceFrom: 3100000, priceTo: 3600000, avgPriceSqft: 2150, soldPct: 17, availableCount: 29 },
      { type: 'Penthouse', count: 5, sizeRange: '2300-2500 sqft', priceFrom: 3700000, priceTo: 3800000, avgPriceSqft: 2400, soldPct: 20, availableCount: 4 }
    ],
    salesVelocity: 1.1,
    lastSaleDate: '2025-06-22',
    priceHistory: [1850, 1875, 1900, 1925, 1945, 1960, 1970, 1975, 1980, 1990, 1995, 1950]
  },
  {
    id: 'NKL-001',
    projectName: 'Palm Beach Towers IV',
    developer: 'Nakheel',
    developerId: 'NKL',
    area: 'Palm Jumeirah',
    areaId: 'PLM',
    status: 'Announced',
    launchDate: '2025-03-25',
    estimatedCompletion: '2027-Q4',
    completionPct: 5,
    totalUnits: 310,
    soldUnits: 15,
    availableUnits: 295,
    soldPct: 4.8,
    propertyTypes: ['1BR', '2BR', '3BR', 'Penthouse'],
    priceFrom: 2500000,
    priceTo: 7200000,
    avgPriceSqft: 3100,
    sizeFrom: 900,
    sizeTo: 2800,
    paymentPlan: {
      name: '75/25',
      downPayment: 25,
      duringConstruction: 50,
      onHandover: 25,
      postHandover: 0,
      installments: [
        { milestone: 'Booking', percentage: 25, estimatedDate: '2025-04-10' },
        { milestone: '25% Construction', percentage: 17, estimatedDate: '2025-10-01' },
        { milestone: '50% Construction', percentage: 17, estimatedDate: '2026-04-01' },
        { milestone: '75% Construction', percentage: 16, estimatedDate: '2026-10-01' },
        { milestone: 'Handover', percentage: 25, estimatedDate: '2027-12-15' }
      ]
    },
    escrowAccount: 'RERA-NKL-PLM-2025-001',
    reraNumber: 'OFF-2025-014002',
    serviceChargeEstimate: 36,
    amenities: ['Beach access', 'Marina', 'Beach club', 'Restaurants', 'Retail', 'Private pools'],
    usp: 'Iconic Palm Jumeirah beach towers with direct beach access and premium amenities',
    areaAvgPriceSqft: 3500,
    priceVsAreaAvg: -11,
    demandScore: 86,
    investorAppeal: 'High',
    rentalYieldEstimate: 4.9,
    capitalGrowthEstimate: 6.5,
    unitMix: [
      { type: '1BR', count: 75, sizeRange: '900-1150 sqft', priceFrom: 2500000, priceTo: 3200000, avgPriceSqft: 2800, soldPct: 6, availableCount: 71 },
      { type: '2BR', count: 125, sizeRange: '1400-1750 sqft', priceFrom: 3800000, priceTo: 5000000, avgPriceSqft: 3200, soldPct: 4, availableCount: 120 },
      { type: '3BR', count: 85, sizeRange: '2000-2400 sqft', priceFrom: 5400000, priceTo: 6800000, avgPriceSqft: 3500, soldPct: 5, availableCount: 81 },
      { type: 'Penthouse', count: 25, sizeRange: '2500-2800 sqft', priceFrom: 6900000, priceTo: 7200000, avgPriceSqft: 3900, soldPct: 4, availableCount: 24 }
    ],
    salesVelocity: 0.4,
    lastSaleDate: '2025-06-08',
    priceHistory: [3000, 3020, 3040, 3070, 3095, 3120, 3140, 3160, 3175, 3185, 3190, 3100]
  },
  {
    id: 'NKL-002',
    projectName: 'Dragon Towers',
    developer: 'Nakheel',
    developerId: 'NKL',
    area: 'Dubai South',
    areaId: 'DST',
    status: 'Announced',
    launchDate: '2025-04-15',
    estimatedCompletion: '2028-Q2',
    completionPct: 3,
    totalUnits: 580,
    soldUnits: 16,
    availableUnits: 564,
    soldPct: 2.8,
    propertyTypes: ['Studio', '1BR', '2BR', '3BR'],
    priceFrom: 700000,
    priceTo: 2500000,
    avgPriceSqft: 1200,
    sizeFrom: 450,
    sizeTo: 1800,
    paymentPlan: {
      name: '80/20 post-handover',
      downPayment: 20,
      duringConstruction: 80,
      onHandover: 0,
      postHandover: 0,
      installments: [
        { milestone: 'Booking', percentage: 20, estimatedDate: '2025-05-01' },
        { milestone: '25% Construction', percentage: 15, estimatedDate: '2025-11-01' },
        { milestone: '50% Construction', percentage: 15, estimatedDate: '2026-05-01' },
        { milestone: '75% Construction', percentage: 15, estimatedDate: '2027-05-01' },
        { milestone: '90% Construction', percentage: 15, estimatedDate: '2028-01-01' },
        { milestone: 'Handover', percentage: 20, estimatedDate: '2028-06-15' }
      ]
    },
    escrowAccount: 'RERA-NKL-DST-2025-002',
    reraNumber: 'OFF-2025-014018',
    serviceChargeEstimate: 23,
    amenities: ['Retail hub', 'Parks', 'Community center', 'Kids zones', 'Sports facilities', 'Water features'],
    usp: 'Large-scale Dragon-themed community development with integrated shopping and recreation',
    areaAvgPriceSqft: 950,
    priceVsAreaAvg: 26,
    demandScore: 74,
    investorAppeal: 'Medium',
    rentalYieldEstimate: 6.1,
    capitalGrowthEstimate: 5.2,
    unitMix: [
      { type: 'Studio', count: 160, sizeRange: '450-550 sqft', priceFrom: 700000, priceTo: 950000, avgPriceSqft: 1100, soldPct: 3, availableCount: 155 },
      { type: '1BR', count: 220, sizeRange: '650-850 sqft', priceFrom: 1050000, priceTo: 1450000, avgPriceSqft: 1200, soldPct: 3, availableCount: 214 },
      { type: '2BR', count: 160, sizeRange: '1050-1400 sqft', priceFrom: 1600000, priceTo: 2050000, avgPriceSqft: 1300, soldPct: 2, availableCount: 157 },
      { type: '3BR', count: 40, sizeRange: '1550-1800 sqft', priceFrom: 2200000, priceTo: 2500000, avgPriceSqft: 1450, soldPct: 2, availableCount: 39 }
    ],
    salesVelocity: 0.4,
    lastSaleDate: '2025-06-12',
    priceHistory: [1150, 1160, 1170, 1180, 1190, 1200, 1210, 1215, 1220, 1225, 1230, 1200]
  },
  {
    id: 'DPR-001',
    projectName: 'Villanova Phase V',
    developer: 'Dubai Properties',
    developerId: 'DPR',
    area: 'Dubai South',
    areaId: 'DST',
    status: 'Announced',
    launchDate: '2025-05-10',
    estimatedCompletion: '2027-Q3',
    completionPct: 4,
    totalUnits: 420,
    soldUnits: 12,
    availableUnits: 408,
    soldPct: 2.9,
    propertyTypes: ['1BR', '2BR', '3BR', 'Townhouse'],
    priceFrom: 950000,
    priceTo: 2650000,
    avgPriceSqft: 1350,
    sizeFrom: 700,
    sizeTo: 2000,
    paymentPlan: {
      name: '70/30',
      downPayment: 20,
      duringConstruction: 50,
      onHandover: 30,
      postHandover: 0,
      installments: [
        { milestone: 'Booking', percentage: 20, estimatedDate: '2025-06-01' },
        { milestone: '30% Construction', percentage: 17, estimatedDate: '2025-12-01' },
        { milestone: '60% Construction', percentage: 17, estimatedDate: '2026-06-01' },
        { milestone: '90% Construction', percentage: 16, estimatedDate: '2027-06-01' },
        { milestone: 'Handover', percentage: 30, estimatedDate: '2027-09-15' }
      ]
    },
    escrowAccount: 'RERA-DPR-DST-2025-001',
    reraNumber: 'OFF-2025-014031',
    serviceChargeEstimate: 24,
    amenities: ['Parks', 'Community center', 'Schools', 'Retail', 'Sports facilities', 'Kids zones'],
    usp: 'Family-friendly community development with schools and integrated retail',
    areaAvgPriceSqft: 950,
    priceVsAreaAvg: 42,
    demandScore: 70,
    investorAppeal: 'Medium',
    rentalYieldEstimate: 5.9,
    capitalGrowthEstimate: 4.8,
    unitMix: [
      { type: '1BR', count: 140, sizeRange: '700-900 sqft', priceFrom: 950000, priceTo: 1350000, avgPriceSqft: 1200, soldPct: 3, availableCount: 136 },
      { type: '2BR', count: 180, sizeRange: '1100-1450 sqft', priceFrom: 1500000, priceTo: 2000000, avgPriceSqft: 1400, soldPct: 3, availableCount: 175 },
      { type: '3BR', count: 80, sizeRange: '1550-1850 sqft', priceFrom: 2100000, priceTo: 2450000, avgPriceSqft: 1550, soldPct: 2, availableCount: 78 },
      { type: 'Townhouse', count: 20, sizeRange: '1800-2000 sqft', priceFrom: 2500000, priceTo: 2650000, avgPriceSqft: 1700, soldPct: 5, availableCount: 19 }
    ],
    salesVelocity: 0.3,
    lastSaleDate: '2025-06-15',
    priceHistory: [1300, 1310, 1320, 1330, 1340, 1350, 1360, 1365, 1370, 1375, 1380, 1350]
  },
  {
    id: 'DPR-002',
    projectName: 'Bellevue Towers II',
    developer: 'Dubai Properties',
    developerId: 'DPR',
    area: 'Downtown Dubai',
    areaId: 'DTN',
    status: 'Launched',
    launchDate: '2025-03-01',
    estimatedCompletion: '2027-Q2',
    completionPct: 12,
    totalUnits: 280,
    soldUnits: 56,
    availableUnits: 224,
    soldPct: 20,
    propertyTypes: ['1BR', '2BR', '3BR'],
    priceFrom: 1300000,
    priceTo: 3200000,
    avgPriceSqft: 2150,
    sizeFrom: 650,
    sizeTo: 1800,
    paymentPlan: {
      name: '60/40',
      downPayment: 30,
      duringConstruction: 30,
      onHandover: 40,
      postHandover: 0,
      installments: [
        { milestone: 'Booking', percentage: 30, estimatedDate: '2025-03-20' },
        { milestone: '35% Construction', percentage: 15, estimatedDate: '2025-09-01' },
        { milestone: '70% Construction', percentage: 15, estimatedDate: '2026-03-01' },
        { milestone: 'Handover', percentage: 40, estimatedDate: '2027-06-15' }
      ]
    },
    escrowAccount: 'RERA-DPR-DTN-2025-002',
    reraNumber: 'OFF-2025-014048',
    serviceChargeEstimate: 26,
    amenities: ['Downtown views', 'Retail district', 'Restaurants', 'Gym', 'Parking', 'Community'],
    usp: 'Prime Downtown location with excellent retail and dining options',
    areaAvgPriceSqft: 3100,
    priceVsAreaAvg: -30,
    demandScore: 72,
    investorAppeal: 'Medium',
    rentalYieldEstimate: 5.3,
    capitalGrowthEstimate: 5.1,
    unitMix: [
      { type: '1BR', count: 105, sizeRange: '650-850 sqft', priceFrom: 1300000, priceTo: 1750000, avgPriceSqft: 1950, soldPct: 22, availableCount: 82 },
      { type: '2BR', count: 125, sizeRange: '1050-1400 sqft', priceFrom: 1900000, priceTo: 2550000, avgPriceSqft: 2150, soldPct: 19, availableCount: 101 },
      { type: '3BR', count: 50, sizeRange: '1600-1800 sqft', priceFrom: 2700000, priceTo: 3200000, avgPriceSqft: 2450, soldPct: 18, availableCount: 41 }
    ],
    salesVelocity: 1.4,
    lastSaleDate: '2025-06-20',
    priceHistory: [2000, 2030, 2060, 2090, 2120, 2145, 2170, 2190, 2210, 2225, 2235, 2150]
  },
  {
    id: 'AZZ-001',
    projectName: 'Riviera Phase IV',
    developer: 'Azizi Developments',
    developerId: 'AZZ',
    area: 'MBR City',
    areaId: 'MBR',
    status: 'Announced',
    launchDate: '2025-06-01',
    estimatedCompletion: '2027-Q3',
    completionPct: 2,
    totalUnits: 510,
    soldUnits: 10,
    availableUnits: 500,
    soldPct: 1.96,
    propertyTypes: ['Studio', '1BR', '2BR', '3BR'],
    priceFrom: 600000,
    priceTo: 2000000,
    avgPriceSqft: 1250,
    sizeFrom: 400,
    sizeTo: 1600,
    paymentPlan: {
      name: '75/25',
      downPayment: 20,
      duringConstruction: 55,
      onHandover: 25,
      postHandover: 0,
      installments: [
        { milestone: 'Booking', percentage: 20, estimatedDate: '2025-06-15' },
        { milestone: '25% Construction', percentage: 19, estimatedDate: '2025-12-01' },
        { milestone: '50% Construction', percentage: 18, estimatedDate: '2026-06-01' },
        { milestone: '75% Construction', percentage: 18, estimatedDate: '2027-01-01' },
        { milestone: 'Handover', percentage: 25, estimatedDate: '2027-09-15' }
      ]
    },
    escrowAccount: 'RERA-AZZ-MBR-2025-001',
    reraNumber: 'OFF-2025-014061',
    serviceChargeEstimate: 22,
    amenities: ['Retail spaces', 'Cafes', 'Parks', 'Sports facilities', 'Community center', 'Kids play zone'],
    usp: 'Affordable luxury with integrated shopping and family-friendly community amenities',
    areaAvgPriceSqft: 1600,
    priceVsAreaAvg: -22,
    demandScore: 68,
    investorAppeal: 'Medium',
    rentalYieldEstimate: 6.2,
    capitalGrowthEstimate: 4.5,
    unitMix: [
      { type: 'Studio', count: 140, sizeRange: '400-500 sqft', priceFrom: 600000, priceTo: 800000, avgPriceSqft: 1150, soldPct: 2, availableCount: 137 },
      { type: '1BR', count: 200, sizeRange: '600-800 sqft', priceFrom: 900000, priceTo: 1200000, avgPriceSqft: 1250, soldPct: 2, availableCount: 196 },
      { type: '2BR', count: 130, sizeRange: '1000-1300 sqft', priceFrom: 1350000, priceTo: 1750000, avgPriceSqft: 1350, soldPct: 2, availableCount: 127 },
      { type: '3BR', count: 40, sizeRange: '1450-1600 sqft', priceFrom: 1850000, priceTo: 2000000, avgPriceSqft: 1500, soldPct: 0, availableCount: 40 }
    ],
    salesVelocity: 0.3,
    lastSaleDate: '2025-05-28',
    priceHistory: [1250, 1255, 1260, 1265, 1270, 1275, 1280, 1282, 1285, 1287, 1290, 1250]
  },
  {
    id: 'AZZ-002',
    projectName: 'Creek Views III',
    developer: 'Azizi Developments',
    developerId: 'AZZ',
    area: 'Business Bay',
    areaId: 'BBY',
    status: 'Launched',
    launchDate: '2025-04-20',
    estimatedCompletion: '2027-Q1',
    completionPct: 9,
    totalUnits: 380,
    soldUnits: 38,
    availableUnits: 342,
    soldPct: 10,
    propertyTypes: ['1BR', '2BR', '3BR'],
    priceFrom: 1200000,
    priceTo: 2600000,
    avgPriceSqft: 1600,
    sizeFrom: 750,
    sizeTo: 1700,
    paymentPlan: {
      name: '70/30',
      downPayment: 20,
      duringConstruction: 50,
      onHandover: 30,
      postHandover: 0,
      installments: [
        { milestone: 'Booking', percentage: 20, estimatedDate: '2025-05-05' },
        { milestone: '30% Construction', percentage: 17, estimatedDate: '2025-11-01' },
        { milestone: '60% Construction', percentage: 17, estimatedDate: '2026-05-01' },
        { milestone: '90% Construction', percentage: 16, estimatedDate: '2027-11-01' },
        { milestone: 'Handover', percentage: 30, estimatedDate: '2027-03-15' }
      ]
    },
    escrowAccount: 'RERA-AZZ-BBY-2025-001',
    reraNumber: 'OFF-2025-014078',
    serviceChargeEstimate: 25,
    amenities: ['Creek views', 'Promenade', 'Retail', 'Restaurants', 'Gym', 'Swimming pool'],
    usp: 'Business Bay creek-side living with affordable luxury and retail integration',
    areaAvgPriceSqft: 1900,
    priceVsAreaAvg: -16,
    demandScore: 70,
    investorAppeal: 'Medium',
    rentalYieldEstimate: 5.5,
    capitalGrowthEstimate: 4.9,
    unitMix: [
      { type: '1BR', count: 150, sizeRange: '750-950 sqft', priceFrom: 1200000, priceTo: 1550000, avgPriceSqft: 1450, soldPct: 10, availableCount: 135 },
      { type: '2BR', count: 160, sizeRange: '1100-1400 sqft', priceFrom: 1700000, priceTo: 2150000, avgPriceSqft: 1600, soldPct: 10, availableCount: 144 },
      { type: '3BR', count: 70, sizeRange: '1550-1700 sqft', priceFrom: 2300000, priceTo: 2600000, avgPriceSqft: 1850, soldPct: 10, availableCount: 63 }
    ],
    salesVelocity: 0.9,
    lastSaleDate: '2025-06-18',
    priceHistory: [1550, 1565, 1580, 1595, 1610, 1620, 1630, 1635, 1640, 1645, 1650, 1600]
  },
  {
    id: 'OMN-001',
    projectName: 'The Opus Residences',
    developer: 'Omniyat',
    developerId: 'OMN',
    area: 'Business Bay',
    areaId: 'BBY',
    status: 'Launched',
    launchDate: '2025-02-10',
    estimatedCompletion: '2027-Q4',
    completionPct: 16,
    totalUnits: 95,
    soldUnits: 28,
    availableUnits: 67,
    soldPct: 29.5,
    propertyTypes: ['2BR', '3BR', 'Penthouse'],
    priceFrom: 3500000,
    priceTo: 9200000,
    avgPriceSqft: 4100,
    sizeFrom: 1250,
    sizeTo: 2800,
    paymentPlan: {
      name: '65/35',
      downPayment: 25,
      duringConstruction: 40,
      onHandover: 35,
      postHandover: 0,
      installments: [
        { milestone: 'Booking', percentage: 25, estimatedDate: '2025-03-01' },
        { milestone: '30% Construction', percentage: 13, estimatedDate: '2025-09-01' },
        { milestone: '60% Construction', percentage: 14, estimatedDate: '2026-03-01' },
        { milestone: '85% Construction', percentage: 13, estimatedDate: '2026-09-01' },
        { milestone: 'Handover', percentage: 35, estimatedDate: '2027-12-15' }
      ]
    },
    escrowAccount: 'RERA-OMN-BBY-2025-001',
    reraNumber: 'OFF-2025-014095',
    serviceChargeEstimate: 38,
    amenities: ['Architectural masterpiece', 'Art gallery', 'Private cinema', 'Spa', 'Signature restaurant', 'Concierge'],
    usp: 'Architectural icon by world-renowned designer with limited-edition residences',
    areaAvgPriceSqft: 1900,
    priceVsAreaAvg: 116,
    demandScore: 92,
    investorAppeal: 'High',
    rentalYieldEstimate: 3.5,
    capitalGrowthEstimate: 8.5,
    unitMix: [
      { type: '2BR', count: 30, sizeRange: '1250-1550 sqft', priceFrom: 3500000, priceTo: 4800000, avgPriceSqft: 3700, soldPct: 33, availableCount: 20 },
      { type: '3BR', count: 45, sizeRange: '1800-2300 sqft', priceFrom: 5200000, priceTo: 7500000, avgPriceSqft: 4200, soldPct: 29, availableCount: 32 },
      { type: 'Penthouse', count: 20, sizeRange: '2400-2800 sqft', priceFrom: 7800000, priceTo: 9200000, avgPriceSqft: 4600, soldPct: 25, availableCount: 15 }
    ],
    salesVelocity: 0.7,
    lastSaleDate: '2025-06-22',
    priceHistory: [3900, 3950, 4000, 4050, 4090, 4130, 4155, 4175, 4190, 4200, 4205, 4100]
  },
  {
    id: 'OMN-002',
    projectName: 'Alba',
    developer: 'Omniyat',
    developerId: 'OMN',
    area: 'Palm Jumeirah',
    areaId: 'PLM',
    status: 'Under Construction',
    launchDate: '2024-10-15',
    estimatedCompletion: '2027-Q2',
    completionPct: 32,
    totalUnits: 60,
    soldUnits: 24,
    availableUnits: 36,
    soldPct: 40,
    propertyTypes: ['3BR', '4BR', 'Penthouse'],
    priceFrom: 6500000,
    priceTo: 14500000,
    avgPriceSqft: 4500,
    sizeFrom: 1800,
    sizeTo: 3500,
    paymentPlan: {
      name: '70/30',
      downPayment: 25,
      duringConstruction: 45,
      onHandover: 30,
      postHandover: 0,
      installments: [
        { milestone: 'Booking', percentage: 25, estimatedDate: '2024-11-01' },
        { milestone: '30% Construction', percentage: 15, estimatedDate: '2025-04-01' },
        { milestone: '60% Construction', percentage: 15, estimatedDate: '2025-10-01' },
        { milestone: '90% Construction', percentage: 15, estimatedDate: '2026-10-01' },
        { milestone: 'Handover', percentage: 30, estimatedDate: '2027-06-15' }
      ]
    },
    escrowAccount: 'RERA-OMN-PLM-2024-001',
    reraNumber: 'OFF-2024-010602',
    serviceChargeEstimate: 42,
    amenities: ['Private beach', 'Yacht club', 'Private spa', 'Marina', 'Concierge', 'Fine dining'],
    usp: 'Ultra-exclusive Palm Jumeirah ultra-luxury with world-class yacht and beach club',
    areaAvgPriceSqft: 3500,
    priceVsAreaAvg: 28,
    demandScore: 94,
    investorAppeal: 'High',
    rentalYieldEstimate: 3.2,
    capitalGrowthEstimate: 9.5,
    unitMix: [
      { type: '3BR', count: 20, sizeRange: '1800-2200 sqft', priceFrom: 6500000, priceTo: 8500000, avgPriceSqft: 4200, soldPct: 45, availableCount: 11 },
      { type: '4BR', count: 30, sizeRange: '2500-3200 sqft', priceFrom: 9000000, priceTo: 11500000, avgPriceSqft: 4400, soldPct: 40, availableCount: 18 },
      { type: 'Penthouse', count: 10, sizeRange: '3200-3500 sqft', priceFrom: 12000000, priceTo: 14500000, avgPriceSqft: 4800, soldPct: 30, availableCount: 7 }
    ],
    salesVelocity: 0.6,
    lastSaleDate: '2025-06-21',
    priceHistory: [4250, 4300, 4350, 4400, 4450, 4490, 4520, 4545, 4560, 4570, 4575, 4500]
  }
]

// Project Launches
export const projectLaunches: ProjectLaunch[] = [
  {
    id: 'LAUNCH-001',
    projectId: 'EMR-001',
    projectName: 'Coral Reef',
    developer: 'Emaar Properties',
    developerId: 'EMR',
    area: 'Palm Jumeirah',
    areaId: 'PLM',
    launchDate: '2025-07-01',
    launchType: 'New Launch',
    totalUnits: 220,
    priceFrom: 3100000,
    avgPriceSqft: 3850,
    status: 'Upcoming',
    daysUntilLaunch: 7,
    earlyBirdDiscount: 5,
    brokerCommission: 2.5,
    registrationDeadline: '2025-07-31'
  },
  {
    id: 'LAUNCH-002',
    projectId: 'DMC-002',
    projectName: 'Safa Two',
    developer: 'DAMAC Properties',
    developerId: 'DMC',
    area: 'Business Bay',
    areaId: 'BBY',
    launchDate: '2025-04-10',
    launchType: 'New Launch',
    totalUnits: 340,
    priceFrom: 1550000,
    avgPriceSqft: 2100,
    status: 'Active',
    daysUntilLaunch: -75,
    earlyBirdDiscount: 3,
    brokerCommission: 2.5,
    registrationDeadline: '2025-05-10'
  },
  {
    id: 'LAUNCH-003',
    projectId: 'MRS-001',
    projectName: 'Bluewaters Residences II',
    developer: 'Meraas',
    developerId: 'MRS',
    area: 'Jumeirah Beach Residence',
    areaId: 'JBR',
    launchDate: '2025-05-01',
    launchType: 'New Launch',
    totalUnits: 290,
    priceFrom: 1800000,
    avgPriceSqft: 2650,
    status: 'Active',
    daysUntilLaunch: -54,
    earlyBirdDiscount: 4,
    brokerCommission: 2.5,
    registrationDeadline: '2025-06-01'
  },
  {
    id: 'LAUNCH-004',
    projectId: 'SBH-001',
    projectName: 'Hartland III',
    developer: 'Sobha Realty',
    developerId: 'SBH',
    area: 'MBR City',
    areaId: 'MBR',
    launchDate: '2025-02-20',
    launchType: 'New Launch',
    totalUnits: 220,
    priceFrom: 1550000,
    avgPriceSqft: 1950,
    status: 'Active',
    daysUntilLaunch: -123,
    brokerCommission: 2.5
  },
  {
    id: 'LAUNCH-005',
    projectId: 'NKL-001',
    projectName: 'Palm Beach Towers IV',
    developer: 'Nakheel',
    developerId: 'NKL',
    area: 'Palm Jumeirah',
    areaId: 'PLM',
    launchDate: '2025-03-25',
    launchType: 'New Launch',
    totalUnits: 310,
    priceFrom: 2500000,
    avgPriceSqft: 3100,
    status: 'Active',
    daysUntilLaunch: -91,
    earlyBirdDiscount: 3,
    brokerCommission: 2.5,
    registrationDeadline: '2025-04-25'
  },
  {
    id: 'LAUNCH-006',
    projectId: 'DPR-001',
    projectName: 'Villanova Phase V',
    developer: 'Dubai Properties',
    developerId: 'DPR',
    area: 'Dubai South',
    areaId: 'DST',
    launchDate: '2025-05-10',
    launchType: 'New Phase',
    totalUnits: 420,
    priceFrom: 950000,
    avgPriceSqft: 1350,
    status: 'Active',
    daysUntilLaunch: -45,
    earlyBirdDiscount: 2,
    brokerCommission: 2.5,
    registrationDeadline: '2025-06-10'
  },
  {
    id: 'LAUNCH-007',
    projectId: 'AZZ-001',
    projectName: 'Riviera Phase IV',
    developer: 'Azizi Developments',
    developerId: 'AZZ',
    area: 'MBR City',
    areaId: 'MBR',
    launchDate: '2025-06-01',
    launchType: 'New Phase',
    totalUnits: 510,
    priceFrom: 600000,
    avgPriceSqft: 1250,
    status: 'Active',
    daysUntilLaunch: -23,
    earlyBirdDiscount: 2,
    brokerCommission: 2.5,
    registrationDeadline: '2025-07-01'
  },
  {
    id: 'LAUNCH-008',
    projectId: 'OMN-001',
    projectName: 'The Opus Residences',
    developer: 'Omniyat',
    developerId: 'OMN',
    area: 'Business Bay',
    areaId: 'BBY',
    launchDate: '2025-02-10',
    launchType: 'New Launch',
    totalUnits: 95,
    priceFrom: 3500000,
    avgPriceSqft: 4100,
    status: 'Active',
    daysUntilLaunch: -133,
    brokerCommission: 2.0
  },
  {
    id: 'LAUNCH-009',
    projectId: 'SBH-003',
    projectName: 'Siniya Island',
    developer: 'Sobha Realty',
    developerId: 'SBH',
    area: 'Palm Jumeirah',
    areaId: 'PLM',
    launchDate: '2025-08-15',
    launchType: 'New Launch',
    totalUnits: 175,
    priceFrom: 4500000,
    avgPriceSqft: 4200,
    status: 'Upcoming',
    daysUntilLaunch: 114,
    earlyBirdDiscount: 6,
    brokerCommission: 2.0,
    registrationDeadline: '2025-09-15'
  },
  {
    id: 'LAUNCH-010',
    projectId: 'NKL-002',
    projectName: 'Dragon Towers',
    developer: 'Nakheel',
    developerId: 'NKL',
    area: 'Dubai South',
    areaId: 'DST',
    launchDate: '2025-04-15',
    launchType: 'New Launch',
    totalUnits: 580,
    priceFrom: 700000,
    avgPriceSqft: 1200,
    status: 'Active',
    daysUntilLaunch: -70,
    earlyBirdDiscount: 2,
    brokerCommission: 2.5,
    registrationDeadline: '2025-05-15'
  }
]

// Summary Stats
export const offPlanSummary: OffPlanSummary = {
  totalActiveProjects: 22,
  totalUnitsAvailable: 6275,
  avgPriceSqft: 2187,
  topDeveloper: 'Emaar Properties',
  hottestArea: 'Downtown Dubai',
  avgSoldPct: 23.4,
  upcomingLaunches: 2,
  totalValuePipeline: 45200000000
}

// ============================================================================
// REAL DATA OVERLAY
// ============================================================================

import { REAL_OFFPLAN_PROJECTS, REAL_DEVELOPERS, REAL_OFFPLAN_SUMMARY } from './realOffPlanData'

if (USE_REAL_OFFPLAN) {
  // Inject real DLD projects into the offPlanProjects array
  // Map real projects to OffPlanProject shape with safe defaults for fields we don't have
  const realMapped: OffPlanProject[] = REAL_OFFPLAN_PROJECTS.map((rp, idx) => ({
    id: rp.id,
    projectName: rp.projectName,
    developer: rp.developer,
    developerId: rp.developerId,
    area: rp.area,
    areaId: rp.areaId,
    status: rp.status as any,
    launchDate: '2026-01-01',
    estimatedCompletion: rp.completionPct >= 100 ? '2026-Q1' : '2027-Q4',
    completionPct: rp.completionPct,
    totalUnits: rp.totalUnits,
    soldUnits: Math.round(rp.totalUnits * 0.4),
    availableUnits: Math.round(rp.totalUnits * 0.6),
    soldPct: 40,
    propertyTypes: ['Mixed'],
    priceFrom: rp.avgUnitPrice > 0 ? Math.round(rp.avgUnitPrice * 0.6) : 1000000,
    priceTo: rp.avgUnitPrice > 0 ? Math.round(rp.avgUnitPrice * 1.4) : 3000000,
    avgPriceSqft: rp.areaAvgPriceSqft || 1500,
    sizeFrom: 500,
    sizeTo: 3000,
    paymentPlan: {
      name: 'Standard',
      downPayment: 20,
      duringConstruction: 60,
      onHandover: 20,
      postHandover: 0,
      installments: []
    },
    escrowAccount: `RERA-${rp.developerId}-${rp.areaId.slice(0, 3).toUpperCase()}`,
    reraNumber: `OFF-2026-${String(idx + 1).padStart(6, '0')}`,
    serviceChargeEstimate: 25,
    amenities: [],
    usp: `${rp.projectName} by ${rp.developer} in ${rp.area}`,
    areaAvgPriceSqft: rp.areaAvgPriceSqft || 1500,
    priceVsAreaAvg: 0,
    demandScore: 70,
    investorAppeal: 'Medium' as const,
    rentalYieldEstimate: 5.5,
    capitalGrowthEstimate: 6.0,
    unitMix: [],
    salesVelocity: 2.0,
    lastSaleDate: '2026-03-20',
    priceHistory: []
  }))

  // Replace mock projects with real ones
  offPlanProjects.length = 0
  offPlanProjects.push(...realMapped)

  // Add real developers that aren't already in the mock developer list
  const existingDevNames = new Set(developers.map(d => d.name.toLowerCase()))
  for (const rd of REAL_DEVELOPERS.slice(0, 30)) {
    if (!existingDevNames.has(rd.name.toLowerCase())) {
      developers.push({
        id: rd.id,
        name: rd.name,
        shortName: rd.shortName,
        established: 2010,
        headquarters: 'Dubai',
        totalProjectsDelivered: 0,
        totalProjectsActive: rd.totalProjectsActive,
        totalUnitsDelivered: 0,
        avgCompletionDelay: 0,
        onTimeDeliveryPct: 70,
        qualityRating: 3.5,
        customerSatisfaction: 75,
        reraRating: 'B+',
        flagshipProjects: rd.projectNames.slice(0, 3),
        activeProjects: [],
        completedProjects: [],
        specialization: ['Mixed-use'],
        avgPriceSqft: 1500,
        priceRange: { min: 500000, max: 5000000 },
        marketSharePct: Math.round(rd.totalUnitsActive / Math.max(1, REAL_OFFPLAN_SUMMARY.totalUnits) * 100),
        trend: 'stable' as const,
        recentLaunches: [],
        escrowCompliance: 'Full' as const,
        financialStability: 'Stable' as const,
      })
    }
  }

  // Update summary with real numbers
  offPlanSummary.totalActiveProjects = REAL_OFFPLAN_SUMMARY.totalActiveProjects
  offPlanSummary.totalUnitsAvailable = REAL_OFFPLAN_SUMMARY.totalUnits
  offPlanSummary.totalValuePipeline = REAL_OFFPLAN_SUMMARY.totalPipelineValue
  offPlanSummary.topDeveloper = REAL_OFFPLAN_SUMMARY.topDeveloper

  // Generate real project launches from the real project list
  projectLaunches.length = 0
  realMapped.slice(0, 15).forEach((p, i) => {
    projectLaunches.push({
      id: `LAUNCH-${String(i + 1).padStart(3, '0')}`,
      projectId: p.id,
      projectName: p.projectName,
      developer: p.developer,
      developerId: p.developerId,
      area: p.area,
      areaId: p.areaId,
      launchDate: '2026-01-15',
      launchType: 'New Launch',
      totalUnits: p.totalUnits,
      priceFrom: p.priceFrom,
      avgPriceSqft: p.avgPriceSqft,
      status: 'Active',
      daysUntilLaunch: -70,
      brokerCommission: 2.5,
    })
  })
}

// Helper Functions
export function getProject(id: string): OffPlanProject | undefined {
  return offPlanProjects.find((p) => p.id === id)
}

export function getProjectsByArea(areaId: string): OffPlanProject[] {
  return offPlanProjects.filter((p) => p.areaId === areaId)
}

export function getProjectsByDeveloper(developerId: string): OffPlanProject[] {
  return offPlanProjects.filter((p) => p.developerId === developerId)
}

export function getProjectsByStatus(status: string): OffPlanProject[] {
  return offPlanProjects.filter((p) => p.status === status)
}

export function getDeveloper(id: string): Developer | undefined {
  return developers.find((d) => d.id === id)
}

export function getDeveloperByName(name: string): Developer | undefined {
  return developers.find((d) => d.name === name)
}

export function getUpcomingLaunches(): ProjectLaunch[] {
  return projectLaunches.filter((l) => l.status === 'Upcoming')
}

export function getActiveLaunches(): ProjectLaunch[] {
  return projectLaunches.filter((l) => l.status === 'Active')
}
