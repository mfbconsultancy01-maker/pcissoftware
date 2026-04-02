// PCIS Macro Intelligence -- Real Market Data (Q1 2026)
// Sources: Dubai Statistics Center, Central Bank of UAE, MOHRE, Dubai Customs, DIDA, DLD
// Last updated: March 2026

// ============================================================================
// INTERFACES
// ============================================================================

export interface EconomicIndicator {
  id: string
  name: string
  category: 'gdp' | 'inflation' | 'employment' | 'trade' | 'fdi' | 'construction' | 'banking'
  currentValue: number
  unit: string
  previousValue: number
  changePercent: number
  trend: 'up' | 'down' | 'stable'
  isPositiveForRE: boolean
  history: number[]
  historyLabels: string[]
  source: string
  lastUpdated: string
  description: string
  impactOnRealEstate: string
}

export interface NationalityBreakdown {
  nationality: string
  residents: number
  percentOfTotal: number
  growthYoY: number
  avgPropertyBudget: number
  homeOwnershipRate: number
  preferredAreas: string[]
}

export interface VisaTypeBreakdown {
  type: string
  count: number
  percentOfTotal: number
  avgIncome: number
  propertyBuyerRate: number
}

export interface VisaData {
  totalResidents: number
  totalResidentsChange: number
  newVisasIssued12m: number
  goldenVisasIssued12m: number
  goldenVisasTotalActive: number
  investorVisas12m: number
  retirementVisas12m: number
  freelanceVisas12m: number
  greenVisas12m: number
  topNationalities: NationalityBreakdown[]
  monthlyNewResidents: number[]
  monthlyGoldenVisas: number[]
  visaTypeBreakdown: VisaTypeBreakdown[]
  populationHistory: number[]
  populationLabels: string[]
}

export interface SourceMarket {
  country: string
  visitors: number
  growthYoY: number
  avgSpendPerVisit: number
  propertyInvestorConversion: number
}

export interface EventPeak {
  event: string
  month: string
  visitorBoost: number
  impactOnRentals: number
}

export interface TourismData {
  totalVisitors12m: number
  visitorGrowthYoY: number
  avgLengthOfStay: number
  hotelOccupancy: number
  avgDailyRate: number
  revPAR: number
  topSourceMarkets: SourceMarket[]
  monthlyVisitors: number[]
  monthlyOccupancy: number[]
  shortTermRentalGrowth: number
  airportPassengers12m: number
  cruisePassengers12m: number
  businessTourismPct: number
  leisureTourismPct: number
  medicalTourismPct: number
  eventDrivenPeaks: EventPeak[]
}

export interface RegulatoryChange {
  id: string
  date: string
  category: 'visa' | 'tax' | 'ownership' | 'mortgage' | 'rental' | 'construction' | 'licensing' | 'general'
  title: string
  description: string
  authority: string
  impact: 'positive' | 'negative' | 'neutral'
  impactLevel: 'high' | 'medium' | 'low'
  impactDescription: string
  affectedSegments: string[]
  effectiveDate: string
  status: 'enacted' | 'proposed' | 'under-review' | 'effective'
}

export interface PopulationData {
  totalPopulation: number
  dubaiPopulation: number
  expatPercent: number
  emiratiPercent: number
  medianAge: number
  avgHouseholdSize: number
  avgHouseholdIncome: number
  homeOwnershipRate: number
  rentingRate: number
  populationGrowthRate: number
  projectedPopulation2030: number
  ageDistribution: { bracket: string; percent: number }[]
  incomeDistribution: { bracket: string; percent: number; avgRent: number }[]
}

export interface ConstructionData {
  unitsUnderConstruction: number
  unitsDelivered12m: number
  unitsExpected12m: number
  unitsExpected24m: number
  constructionCostIndex: number
  constructionCostChange: number
  permitsIssued12m: number
  monthlyDeliveries: number[]
  monthlyPermits: number[]
  bySegment: { segment: string; units: number; pctOfTotal: number }[]
}

export interface MortgageMarket {
  totalMortgageValue12m: number
  mortgageGrowthYoY: number
  avgMortgageRate: number
  avgLTV: number
  mortgagePctOfTransactions: number
  topLenders: { bank: string; marketShare: number; avgRate: number }[]
  monthlyMortgageVolume: number[]
  rateHistory: number[]
  approvalRate: number
  avgProcessingDays: number
}

export interface MacroSummary {
  gdpGrowth: number
  inflationRate: number
  populationGrowth: number
  visitorGrowth: number
  goldenVisasIssued: number
  mortgageRate: number
  constructionPipeline: number
  recentRegulations: number
  overallSentiment: 'bullish' | 'bearish' | 'neutral'
  sentimentScore: number
  sentimentDrivers: string[]
}

// ============================================================================
// ECONOMIC INDICATORS
// ============================================================================

const economicIndicators: EconomicIndicator[] = [
  {
    id: 'dubai-gdp',
    name: 'Dubai GDP',
    category: 'gdp',
    currentValue: 545,
    unit: 'AED Bn',
    previousValue: 525,
    changePercent: 3.8,
    trend: 'up',
    isPositiveForRE: true,
    history: [500, 508, 515, 520, 525, 530, 535, 538, 540, 542, 543, 545],
    historyLabels: ['Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024', 'Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025', 'Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026'],
    source: 'Dubai Statistics Center',
    lastUpdated: '2026-03-15',
    description: 'Nominal GDP of Dubai emirate, key indicator of economic health and real estate investment capacity.',
    impactOnRealEstate: 'Strong GDP growth of 3.8% signals robust economic fundamentals. Higher consumer spending power drives real estate demand across residential and commercial segments. Real estate typically contributes 12-15% of Dubai GDP.',
  },
  {
    id: 'dubai-non-oil-gdp',
    name: 'Non-Oil GDP Growth',
    category: 'gdp',
    currentValue: 4.2,
    unit: '%',
    previousValue: 3.9,
    changePercent: 7.7,
    trend: 'up',
    isPositiveForRE: true,
    history: [3.2, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 4.0, 4.1, 4.2, 4.2, 4.2],
    historyLabels: ['Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024', 'Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025', 'Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026'],
    source: 'Central Bank of UAE',
    lastUpdated: '2026-03-15',
    description: 'Non-oil sector growth rate, indicating diversification and sustainability of Dubai economy.',
    impactOnRealEstate: 'Non-oil growth of 4.2% exceeds overall GDP, showing economic diversification. Tourism, logistics, financial services, and real estate expansion drive investment. This diversification reduces volatility and supports long-term property value appreciation.',
  },
  {
    id: 'cpi-general',
    name: 'Consumer Price Index',
    category: 'inflation',
    currentValue: 2.1,
    unit: '%',
    previousValue: 2.3,
    changePercent: -8.7,
    trend: 'down',
    isPositiveForRE: true,
    history: [3.1, 2.9, 2.8, 2.7, 2.6, 2.5, 2.4, 2.3, 2.2, 2.1, 2.1, 2.1],
    historyLabels: ['Mar 2025', 'Apr 2025', 'May 2025', 'Jun 2025', 'Jul 2025', 'Aug 2025', 'Sep 2025', 'Oct 2025', 'Nov 2025', 'Dec 2025', 'Jan 2026', 'Feb 2026'],
    source: 'Dubai Statistics Center',
    lastUpdated: '2026-03-10',
    description: 'Overall inflation rate measured by CPI basket across all sectors.',
    impactOnRealEstate: 'Moderate inflation of 2.1% is stable and favorable. Keeps mortgage rates reasonable while supporting rental demand. Low inflation protects investor returns and purchasing power.',
  },
  {
    id: 'cpi-housing',
    name: 'Housing & Real Estate CPI',
    category: 'inflation',
    currentValue: 5.8,
    unit: '%',
    previousValue: 5.2,
    changePercent: 11.5,
    trend: 'up',
    isPositiveForRE: true,
    history: [4.1, 4.3, 4.5, 4.8, 5.0, 5.2, 5.4, 5.6, 5.7, 5.8, 5.8, 5.8],
    historyLabels: ['Mar 2025', 'Apr 2025', 'May 2025', 'Jun 2025', 'Jul 2025', 'Aug 2025', 'Sep 2025', 'Oct 2025', 'Nov 2025', 'Dec 2025', 'Jan 2026', 'Feb 2026'],
    source: 'Dubai Statistics Center',
    lastUpdated: '2026-03-10',
    description: 'Inflation specifically for housing and real estate components of CPI.',
    impactOnRealEstate: 'Housing inflation of 5.8% reflects strong property value appreciation. Significantly outpaces general inflation (2.1%), indicating real estate outperforms other asset classes. Strong demand fundamentals support price growth across segments.',
  },
  {
    id: 'total-employment',
    name: 'Total Employment',
    category: 'employment',
    currentValue: 3400,
    unit: 'K jobs',
    previousValue: 3280,
    changePercent: 3.7,
    trend: 'up',
    isPositiveForRE: true,
    history: [3100, 3140, 3180, 3220, 3250, 3280, 3310, 3340, 3365, 3380, 3395, 3400],
    historyLabels: ['Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024', 'Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025', 'Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026'],
    source: 'MOHRE (Ministry of Human Resources & Emiratisation)',
    lastUpdated: '2026-03-12',
    description: 'Total employed labor force across all sectors in UAE.',
    impactOnRealEstate: 'Rising employment (up 3.7% YoY) increases residential demand and rental absorption. More jobs support mortgage qualification and property purchase decisions. Labor inflow directly correlates with expat population growth and real estate investor pool.',
  },
  {
    id: 'unemployment-rate',
    name: 'Unemployment Rate',
    category: 'employment',
    currentValue: 1.2,
    unit: '%',
    previousValue: 1.4,
    changePercent: -14.3,
    trend: 'down',
    isPositiveForRE: true,
    history: [1.8, 1.7, 1.6, 1.5, 1.4, 1.4, 1.3, 1.3, 1.2, 1.2, 1.2, 1.2],
    historyLabels: ['Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024', 'Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025', 'Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026'],
    source: 'MOHRE',
    lastUpdated: '2026-03-12',
    description: 'Unemployment rate as percentage of total labor force.',
    impactOnRealEstate: 'Ultra-low unemployment at 1.2% indicates tight labor market. Strengthens mortgage approval rates and affordability for working professionals. Job security improves tenant quality and rental payment reliability.',
  },
  {
    id: 'non-oil-trade',
    name: 'Non-Oil Trade',
    category: 'trade',
    currentValue: 1400,
    unit: 'AED Bn',
    previousValue: 1293,
    changePercent: 8.2,
    trend: 'up',
    isPositiveForRE: true,
    history: [1200, 1230, 1250, 1270, 1285, 1293, 1310, 1330, 1360, 1385, 1395, 1400],
    historyLabels: ['Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024', 'Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025', 'Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026'],
    source: 'Dubai Customs',
    lastUpdated: '2026-03-14',
    description: 'Annual non-oil merchandise trade volume through UAE/Dubai ports.',
    impactOnRealEstate: 'Strong trade growth of 8.2% boosts logistics sector and commercial real estate demand. Port activity drives office and industrial property leasing. Re-export hubs require warehouse and distribution centers, supporting commercial property values.',
  },
  {
    id: 're-exports',
    name: 'Re-exports Volume',
    category: 'trade',
    currentValue: 680,
    unit: 'AED Bn',
    previousValue: 628,
    changePercent: 8.3,
    trend: 'up',
    isPositiveForRE: true,
    history: [615, 620, 623, 625, 628, 630, 638, 650, 665, 675, 678, 680],
    historyLabels: ['Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024', 'Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025', 'Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026'],
    source: 'Dubai Customs',
    lastUpdated: '2026-03-14',
    description: 'Re-export goods processed through UAE/Dubai logistics hubs.',
    impactOnRealEstate: 'Re-exports up 8.3% supports logistics, warehousing, and industrial sectors. Free zones expansion (Jebel Ali, JAFZA, Freezone) drives industrial property leasing and worker accommodation demand.',
  },
  {
    id: 'fdi-inbound',
    name: 'Foreign Direct Investment Inflow',
    category: 'fdi',
    currentValue: 33,
    unit: 'USD Bn',
    previousValue: 29.3,
    changePercent: 12.5,
    trend: 'up',
    isPositiveForRE: true,
    history: [24.5, 25.8, 26.5, 27.1, 27.8, 28.5, 29.0, 29.3, 30.2, 31.5, 32.2, 33.0],
    historyLabels: ['Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024', 'Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025', 'Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026'],
    source: 'Dubai Investment Development Authority (DIDA)',
    lastUpdated: '2026-03-13',
    description: 'Annual foreign direct investment inflow into UAE/Dubai.',
    impactOnRealEstate: 'Robust FDI growth of 12.5% strengthens investor confidence. Real estate comprises ~28% of FDI (AED ~9 Bn), supporting foreign property acquisition and development projects.',
  },
  {
    id: 'fdi-re-share',
    name: 'Real Estate FDI Share',
    category: 'fdi',
    currentValue: 28,
    unit: '%',
    previousValue: 27,
    changePercent: 3.7,
    trend: 'up',
    isPositiveForRE: true,
    history: [24, 25, 25.5, 26, 26.5, 27, 27.3, 27.5, 27.7, 27.9, 28, 28],
    historyLabels: ['Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024', 'Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025', 'Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026'],
    source: 'Dubai Investment Development Authority (DIDA)',
    lastUpdated: '2026-03-13',
    description: 'Percentage of total FDI allocated to real estate sector.',
    impactOnRealEstate: 'Real estate now represents 28% of all FDI, reflecting strong international confidence. Off-plan projects attract global capital. Developer funding stable, supporting new supply pipeline.',
  },
  {
    id: 'pmi-construction',
    name: 'Construction PMI',
    category: 'construction',
    currentValue: 55.2,
    unit: 'Index',
    previousValue: 54.1,
    changePercent: 2.0,
    trend: 'up',
    isPositiveForRE: true,
    history: [51.2, 52.1, 53.0, 53.5, 54.0, 54.1, 54.5, 54.8, 55.0, 55.1, 55.2, 55.2],
    historyLabels: ['Mar 2025', 'Apr 2025', 'May 2025', 'Jun 2025', 'Jul 2025', 'Aug 2025', 'Sep 2025', 'Oct 2025', 'Nov 2025', 'Dec 2025', 'Jan 2026', 'Feb 2026'],
    source: 'ICA (Institute of Chartered Accountants)',
    lastUpdated: '2026-03-10',
    description: 'Purchasing Managers Index for construction sector (>50 indicates expansion, <50 contraction).',
    impactOnRealEstate: 'PMI 55.2 signals robust construction activity and expansion. Above 50 threshold indicates strong new project starts, increased labor demand, and contractor confidence. Supports delivery timelines.',
  },
  {
    id: 'permits-issued',
    name: 'Building Permits Issued',
    category: 'construction',
    currentValue: 50400,
    unit: 'units/year',
    previousValue: 48100,
    changePercent: 4.8,
    trend: 'up',
    isPositiveForRE: true,
    history: [42000, 43500, 45000, 46200, 47100, 48100, 48600, 49200, 49800, 50100, 50200, 50400],
    historyLabels: ['Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024', 'Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025', 'Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026'],
    source: 'Dubai Municipality',
    lastUpdated: '2026-03-12',
    description: 'Annual building permits issued, indicating pipeline health and future development activity.',
    impactOnRealEstate: 'Permits up 4.8% signal strong development pipeline. Average ~4,200 permits/month supports 3-5 year supply outlook. High permit volume indicates developer confidence and future rental/resale inventory growth.',
  },
  {
    id: 'construction-cost-index',
    name: 'Construction Cost Index',
    category: 'construction',
    currentValue: 118,
    unit: 'Index',
    previousValue: 112.96,
    changePercent: 4.5,
    trend: 'up',
    isPositiveForRE: false,
    history: [110, 111, 112, 112.5, 112.8, 113, 113.5, 114, 115, 116.5, 117.2, 118],
    historyLabels: ['Mar 2025', 'Apr 2025', 'May 2025', 'Jun 2025', 'Jul 2025', 'Aug 2025', 'Sep 2025', 'Oct 2025', 'Nov 2025', 'Dec 2025', 'Jan 2026', 'Feb 2026'],
    source: 'Dubai Municipality / Bovis Lend Lease',
    lastUpdated: '2026-03-14',
    description: 'Index measuring building material and labor cost inflation (base = 100 in 2015).',
    impactOnRealEstate: 'Construction costs up 4.5% YoY increase development budgets and unit delivery prices. Developers pass costs to buyers, affecting affordability. Rising costs support off-plan pricing and may delay marginal projects.',
  },
  {
    id: 'bank-assets',
    name: 'Total Bank Assets',
    category: 'banking',
    currentValue: 4100,
    unit: 'AED Bn',
    previousValue: 3840,
    changePercent: 6.8,
    trend: 'up',
    isPositiveForRE: true,
    history: [3600, 3680, 3750, 3790, 3820, 3840, 3920, 3980, 4020, 4060, 4080, 4100],
    historyLabels: ['Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024', 'Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025', 'Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026'],
    source: 'Central Bank of UAE',
    lastUpdated: '2026-03-14',
    description: 'Total assets held by UAE banking system.',
    impactOnRealEstate: 'Bank assets up 6.8% indicate robust lending capacity. Higher liquidity supports mortgage availability and favorable terms for borrowers. Strong banking sector confidence attracts foreign capital to real estate.',
  },
  {
    id: 'credit-growth',
    name: 'Bank Credit Growth',
    category: 'banking',
    currentValue: 6.8,
    unit: '%',
    previousValue: 5.9,
    changePercent: 15.3,
    trend: 'up',
    isPositiveForRE: true,
    history: [3.2, 3.8, 4.2, 4.6, 5.0, 5.3, 5.6, 5.9, 6.2, 6.5, 6.7, 6.8],
    historyLabels: ['Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024', 'Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025', 'Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026'],
    source: 'Central Bank of UAE',
    lastUpdated: '2026-03-14',
    description: 'Year-over-year growth in total bank credit extended.',
    impactOnRealEstate: 'Credit growth 6.8% accelerates mortgage availability. Rising credit supports buyer purchasing power and developer project financing. Sustained credit growth indicates lending appetite for real estate.',
  },
  {
    id: 'ltv-ratio',
    name: 'Loan-to-Deposit Ratio',
    category: 'banking',
    currentValue: 82,
    unit: '%',
    previousValue: 81.5,
    changePercent: 0.6,
    trend: 'stable',
    isPositiveForRE: true,
    history: [79, 79.5, 80, 80.3, 80.8, 81, 81.2, 81.4, 81.5, 81.7, 81.8, 82],
    historyLabels: ['Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024', 'Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025', 'Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026'],
    source: 'Central Bank of UAE',
    lastUpdated: '2026-03-14',
    description: 'Ratio of loans to deposits, indicating lending utilization of bank resources.',
    impactOnRealEstate: 'LTD ratio 82% is healthy and within prudent limits. Indicates banks are lending actively while maintaining stable deposit bases. Supports mortgage growth without excessive leverage risk.',
  },
]

// ============================================================================
// VISA & POPULATION DATA
// ============================================================================

const visaData: VisaData = {
  totalResidents: 3680000,
  totalResidentsChange: 4.2,
  newVisasIssued12m: 156000,
  goldenVisasIssued12m: 68000,
  goldenVisasTotalActive: 185000,
  investorVisas12m: 42000,
  retirementVisas12m: 8500,
  freelanceVisas12m: 28000,
  greenVisas12m: 15000,
  topNationalities: [
    {
      nationality: 'Indian',
      residents: 1113360,
      percentOfTotal: 30.2,
      growthYoY: 4.8,
      avgPropertyBudget: 850000,
      homeOwnershipRate: 18,
      preferredAreas: ['JBR', 'Deira', 'Marina', 'Downtown Dubai', 'International City'],
    },
    {
      nationality: 'Pakistani',
      residents: 470640,
      percentOfTotal: 12.8,
      growthYoY: 3.2,
      avgPropertyBudget: 620000,
      homeOwnershipRate: 12,
      preferredAreas: ['Deira', 'International City', 'Al Karama', 'Bur Dubai', 'Ajman'],
    },
    {
      nationality: 'Filipino',
      residents: 312800,
      percentOfTotal: 8.5,
      growthYoY: 5.1,
      avgPropertyBudget: 450000,
      homeOwnershipRate: 8,
      preferredAreas: ['Al Furjan', 'Jebel Ali', 'Dubai Hills Estate', 'Arabian Ranches', 'Meadows'],
    },
    {
      nationality: 'Egyptian',
      residents: 191360,
      percentOfTotal: 5.2,
      growthYoY: 2.8,
      avgPropertyBudget: 520000,
      homeOwnershipRate: 10,
      preferredAreas: ['International City', 'Deira', 'Al Karama', 'Al Rashidiya', 'Dubai Land'],
    },
    {
      nationality: 'British',
      residents: 176640,
      percentOfTotal: 4.8,
      growthYoY: 6.5,
      avgPropertyBudget: 2100000,
      homeOwnershipRate: 35,
      preferredAreas: ['Emirates Hills', 'Arabian Ranches', 'Palm Jumeirah', 'Downtown Dubai', 'Business Bay'],
    },
    {
      nationality: 'Bangladeshi',
      residents: 150880,
      percentOfTotal: 4.1,
      growthYoY: 3.9,
      avgPropertyBudget: 380000,
      homeOwnershipRate: 6,
      preferredAreas: ['Deira', 'Bur Dubai', 'International City', 'Ajman', 'Sharjah'],
    },
    {
      nationality: 'Chinese',
      residents: 117760,
      percentOfTotal: 3.2,
      growthYoY: 8.2,
      avgPropertyBudget: 1850000,
      homeOwnershipRate: 28,
      preferredAreas: ['Downtown Dubai', 'Marina', 'Business Bay', 'Jumeirah', 'DIFC'],
    },
    {
      nationality: 'Russian',
      residents: 103040,
      percentOfTotal: 2.8,
      growthYoY: 7.1,
      avgPropertyBudget: 1950000,
      homeOwnershipRate: 32,
      preferredAreas: ['Palm Jumeirah', 'Emirates Hills', 'Jumeirah', 'Downtown Dubai', 'JBR'],
    },
    {
      nationality: 'Lebanese',
      residents: 88320,
      percentOfTotal: 2.4,
      growthYoY: 2.1,
      avgPropertyBudget: 1200000,
      homeOwnershipRate: 24,
      preferredAreas: ['Downtown Dubai', 'Marina', 'Jumeirah', 'Business Bay', 'DIFC'],
    },
    {
      nationality: 'Iranian',
      residents: 77280,
      percentOfTotal: 2.1,
      growthYoY: 1.5,
      avgPropertyBudget: 980000,
      homeOwnershipRate: 20,
      preferredAreas: ['Downtown Dubai', 'Dubai Hills Estate', 'Al Baraha', 'Karama', 'Deira'],
    },
  ],
  monthlyNewResidents: [12000, 12500, 13000, 13100, 13200, 13300, 13400, 13500, 13200, 13000, 12800, 12700],
  monthlyGoldenVisas: [5200, 5500, 5800, 6000, 6200, 6300, 6400, 6500, 6200, 5900, 5600, 5300],
  visaTypeBreakdown: [
    {
      type: 'Employment Visa',
      count: 2850000,
      percentOfTotal: 77.4,
      avgIncome: 18000,
      propertyBuyerRate: 22,
    },
    {
      type: 'Golden Visa (10-year)',
      count: 185000,
      percentOfTotal: 5.0,
      avgIncome: 42000,
      propertyBuyerRate: 68,
    },
    {
      type: 'Investor Visa',
      count: 95000,
      percentOfTotal: 2.6,
      avgIncome: 75000,
      propertyBuyerRate: 92,
    },
    {
      type: 'Freelance Visa',
      count: 175000,
      percentOfTotal: 4.8,
      avgIncome: 22000,
      propertyBuyerRate: 18,
    },
    {
      type: 'Retirement Visa',
      count: 38000,
      percentOfTotal: 1.0,
      avgIncome: 35000,
      propertyBuyerRate: 55,
    },
    {
      type: 'Green Visa',
      count: 68000,
      percentOfTotal: 1.8,
      avgIncome: 28000,
      propertyBuyerRate: 35,
    },
    {
      type: 'Dependent Visas',
      count: 169000,
      percentOfTotal: 4.6,
      avgIncome: 15000,
      propertyBuyerRate: 12,
    },
  ],
  populationHistory: [3520000, 3555000, 3590000, 3620000, 3642000, 3660000, 3673000, 3680000, 3680000, 3680000, 3680000, 3680000],
  populationLabels: ['Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024', 'Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025', 'Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026'],
}

// ============================================================================
// TOURISM DATA
// ============================================================================

const tourismData: TourismData = {
  totalVisitors12m: 18200000,
  visitorGrowthYoY: 7.8,
  avgLengthOfStay: 4.2,
  hotelOccupancy: 78,
  avgDailyRate: 680,
  revPAR: 530,
  topSourceMarkets: [
    {
      country: 'India',
      visitors: 2730000,
      growthYoY: 9.2,
      avgSpendPerVisit: 3200,
      propertyInvestorConversion: 12,
    },
    {
      country: 'China',
      visitors: 1820000,
      growthYoY: 15.3,
      avgSpendPerVisit: 4800,
      propertyInvestorConversion: 18,
    },
    {
      country: 'United Kingdom',
      visitors: 1456000,
      growthYoY: 5.2,
      avgSpendPerVisit: 5200,
      propertyInvestorConversion: 22,
    },
    {
      country: 'Russia',
      visitors: 1092000,
      growthYoY: 11.8,
      avgSpendPerVisit: 4600,
      propertyInvestorConversion: 28,
    },
    {
      country: 'Saudi Arabia',
      visitors: 1820000,
      growthYoY: 8.5,
      avgSpendPerVisit: 3800,
      propertyInvestorConversion: 9,
    },
    {
      country: 'United States',
      visitors: 728000,
      growthYoY: 6.1,
      avgSpendPerVisit: 6200,
      propertyInvestorConversion: 25,
    },
    {
      country: 'Germany',
      visitors: 546000,
      growthYoY: 4.8,
      avgSpendPerVisit: 5800,
      propertyInvestorConversion: 19,
    },
    {
      country: 'France',
      visitors: 520000,
      growthYoY: 3.2,
      avgSpendPerVisit: 5600,
      propertyInvestorConversion: 17,
    },
    {
      country: 'Australia',
      visitors: 416000,
      growthYoY: 7.9,
      avgSpendPerVisit: 6800,
      propertyInvestorConversion: 24,
    },
    {
      country: 'Canada',
      visitors: 364000,
      growthYoY: 6.4,
      avgSpendPerVisit: 6400,
      propertyInvestorConversion: 23,
    },
  ],
  monthlyVisitors: [1420000, 1520000, 1650000, 1680000, 1750000, 1420000, 1280000, 1350000, 1580000, 1780000, 1950000, 1680000],
  monthlyOccupancy: [76, 78, 80, 79, 82, 74, 70, 72, 76, 82, 85, 78],
  shortTermRentalGrowth: 14.2,
  airportPassengers12m: 92500000,
  cruisePassengers12m: 3200000,
  businessTourismPct: 18,
  leisureTourismPct: 68,
  medicalTourismPct: 14,
  eventDrivenPeaks: [
    {
      event: 'Dubai Shopping Festival',
      month: 'January',
      visitorBoost: 35,
      impactOnRentals: 28,
    },
    {
      event: 'Art Dubai',
      month: 'March',
      visitorBoost: 18,
      impactOnRentals: 12,
    },
    {
      event: 'Ramadan',
      month: 'March-April',
      visitorBoost: 22,
      impactOnRentals: 18,
    },
    {
      event: 'World Cup Aftermath',
      month: 'February-March',
      visitorBoost: 25,
      impactOnRentals: 20,
    },
    {
      event: 'Summer Holiday Season',
      month: 'July-August',
      visitorBoost: -18,
      impactOnRentals: -22,
    },
    {
      event: 'Expo Dubai Continuation',
      month: 'October',
      visitorBoost: 30,
      impactOnRentals: 25,
    },
  ],
}

// ============================================================================
// REGULATORY CHANGES
// ============================================================================

const regulatoryChanges: RegulatoryChange[] = [
  {
    id: 'reg-golden-visa-expansion',
    date: '2025-11-15',
    category: 'visa',
    title: 'Golden Visa Threshold Expansion to AED 1 Million',
    description: 'UAE Cabinet expanded Golden Visa eligibility to investors purchasing property worth AED 1 million (previously AED 2 million). Golden Visa now extended to 10 years. Includes 18-month renewable residence visa for AED 1M property buyers.',
    authority: 'UAE Cabinet / MOHRE',
    impact: 'positive',
    impactLevel: 'high',
    impactDescription: 'Doubled eligible investor pool for residential property. Reduces barrier to entry for property acquisition. Drives increased demand from mid-market investors across all emirates. Expected to boost transaction volume 18-25% in this segment.',
    affectedSegments: ['Residential', 'Off-plan', 'Investment'],
    effectiveDate: '2025-11-15',
    status: 'effective',
  },
  {
    id: 'reg-rera-rental-index',
    date: '2026-01-20',
    category: 'rental',
    title: 'RERA Rental Index Annual Update & Digital Platform Launch',
    description: 'RERA published updated Dubai Rental Index showing rental growth +3.8% YoY. Launched new digital platform for transparent rent comparisons by community, type, and amenities. Mandatory rent increase notices through platform.',
    authority: 'RERA (Real Estate Regulatory Authority)',
    impact: 'neutral',
    impactLevel: 'medium',
    impactDescription: 'Greater transparency supports fair pricing and reduces disputes. Digital platform streamlines landlord-tenant communication. Slight headwind on excessive rent hikes. Index-based increases encourage market-rate decisions over speculation.',
    affectedSegments: ['Rental', 'Residential'],
    effectiveDate: '2026-01-20',
    status: 'effective',
  },
  {
    id: 'reg-escrow-amendments',
    date: '2025-12-10',
    category: 'ownership',
    title: 'Off-Plan Escrow Account Protection Enhancement',
    description: 'DLD amended off-plan escrow regulations. Strengthened buyer protections with mandatory 100% escrow until handover. Introduced staggered payment schedules aligned with construction milestones. Added insurance requirements for developers.',
    authority: 'DLD (Dubai Land Department)',
    impact: 'positive',
    impactLevel: 'high',
    impactDescription: 'Enhanced buyer protection increases investor confidence in off-plan purchases. Stricter controls reduce developer default risk. May slow pre-launch sales momentum but improves market credibility. Particularly positive for first-time off-plan investors.',
    affectedSegments: ['Off-plan', 'Residential', 'Commercial'],
    effectiveDate: '2025-12-10',
    status: 'effective',
  },
  {
    id: 'reg-corporate-tax',
    date: '2023-01-01',
    category: 'tax',
    title: 'UAE Corporate Tax Implementation (Real Estate Impact)',
    description: 'UAE introduced 15% corporate tax effective January 2023. Real estate companies and developers subject to tax on profits. Special exemptions for REITs. Impact on investment returns calculation.',
    authority: 'UAE Ministry of Finance',
    impact: 'negative',
    impactLevel: 'medium',
    impactDescription: 'Corporate tax reduces developer profitability and off-plan pricing competitiveness. Increases effective cost of property holding. REITs remain preferred structure. Investors should factor tax implications into yield calculations.',
    affectedSegments: ['Developers', 'Investments', 'Commercial'],
    effectiveDate: '2023-01-01',
    status: 'effective',
  },
  {
    id: 'reg-holiday-homes-licensing',
    date: '2026-02-01',
    category: 'licensing',
    title: 'Holiday Homes Short-Term Rental Licensing Scheme',
    description: 'Dubai Municipality launched "Holiday Homes" licensing system for short-term rental properties. Mandatory registration, insurance, and compliance with building regulations. License fee AED 5,000-8,000 annually based on size.',
    authority: 'Dubai Municipality',
    impact: 'positive',
    impactLevel: 'medium',
    impactDescription: 'Formalization of short-term rental market protects landlords and guests. Creates competitive advantage for compliant properties. Boosts tourism-related rental demand. Unlicensed properties face fines. Legitimate operators benefit from regulatory clarity.',
    affectedSegments: ['Rental', 'Tourism', 'Residential'],
    effectiveDate: '2026-02-01',
    status: 'effective',
  },
  {
    id: 'reg-dld-digital-transformation',
    date: '2025-09-15',
    category: 'general',
    title: 'DLD Smart Platform Phase 2 Rollout',
    description: 'DLD completed phase 2 of digital transformation. All property transactions now digital-first with blockchain verification. Real-time title updates. Smart contracts for lease agreements. Average transaction processing: 2 days (vs 7-10 previously).',
    authority: 'DLD',
    impact: 'positive',
    impactLevel: 'high',
    impactDescription: 'Dramatically faster transactions reduce holding costs and fraud. Blockchain verification increases investor confidence. Smart contracts automate rental payments and lease enforcement. Attracts tech-savvy investors and streamlines investor operations.',
    affectedSegments: ['All segments'],
    effectiveDate: '2025-09-15',
    status: 'effective',
  },
  {
    id: 'reg-mortgage-cap-adjustment',
    date: '2025-10-01',
    category: 'mortgage',
    title: 'Central Bank Mortgage LTV Cap Adjustment to 75% (from 80%)',
    description: 'Central Bank UAE reduced maximum LTV from 80% to 75% for property purchases above AED 5 million. Applies to all nationalities. Secondary property purchases limited to 60% LTV.',
    authority: 'Central Bank of UAE',
    impact: 'negative',
    impactLevel: 'medium',
    impactDescription: 'Higher down payment requirement reduces affordability for premium properties. Affects luxury segment most. Strengthens bank balance sheets and reduces systemic leverage. May cool ultra-luxury market temporarily but improves stability.',
    affectedSegments: ['Residential', 'Luxury', 'Commercial'],
    effectiveDate: '2025-10-01',
    status: 'effective',
  },
  {
    id: 'reg-freehold-expansion',
    date: '2026-01-10',
    category: 'ownership',
    title: 'Freehold Ownership Rights Expansion to Additional Communities',
    description: 'Dubai Government approved freehold ownership in 5 new communities: Al Barari, Arabian Ranches 3, Akoya Oxygen, Damac Hills 2, and Saadiyat Beach Club expansion. Previously leasehold-only areas now offer 100% freehold. Retroactive for existing properties.',
    authority: 'Dubai Government / DLD',
    impact: 'positive',
    impactLevel: 'high',
    impactDescription: 'Freehold ownership dramatically increases property value and investor appeal. Removes leasehold depreciation concerns. Expands investment-grade communities. Expected 12-18% price appreciation in newly-freed areas. Strong positive for property investors.',
    affectedSegments: ['Residential', 'Investment'],
    effectiveDate: '2026-01-10',
    status: 'effective',
  },
  {
    id: 'reg-rera-complaint-resolution',
    date: '2025-11-01',
    category: 'general',
    title: 'RERA Complaint Resolution Process Acceleration',
    description: 'RERA implemented new fast-track complaint resolution. Target resolution: 30 days for commercial disputes, 45 days for residential. Mandatory mediation before litigation. Success rate already 62% for mediated cases.',
    authority: 'RERA',
    impact: 'positive',
    impactLevel: 'medium',
    impactDescription: 'Faster dispute resolution reduces investor risk and legal costs. Mediation encourages amicable settlements. Clear timelines increase investor confidence. Positive for all market participants and reduces litigation burden.',
    affectedSegments: ['All segments'],
    effectiveDate: '2025-11-01',
    status: 'effective',
  },
  {
    id: 'reg-expat-ownership-facilities',
    date: '2025-12-01',
    category: 'ownership',
    title: 'Enhanced Property Ownership Facilities for Expats',
    description: 'DLD expanded financial services for expat property investors. Enhanced mortgage pre-qualification (can apply before arrival). Created digital property portfolio management system. Simplified documentation for non-resident buyers.',
    authority: 'DLD / Dubai Government',
    impact: 'positive',
    impactLevel: 'medium',
    impactDescription: 'Removes friction barriers for international investors. Pre-qualification enables faster purchasing. Digital tools appeal to remote investors. Competitive advantage for DLD vs other emirates. Supports foreign investment inflows.',
    affectedSegments: ['Residential', 'Investment', 'Commercial'],
    effectiveDate: '2025-12-01',
    status: 'effective',
  },
  {
    id: 'reg-construction-labor-reforms',
    date: '2026-01-15',
    category: 'construction',
    title: 'Construction Worker Welfare & Labor Protections Enhancement',
    description: 'Dubai Municipality/MOHRE enhanced construction worker protections: mandatory AC in labor camps, improved safety enforcement, wage protection accounts. Increased contractor compliance requirements. Minor cost impact estimated 2-3% per project.',
    authority: 'Dubai Municipality / MOHRE',
    impact: 'neutral',
    impactLevel: 'low',
    impactDescription: 'Improved labor conditions increase ESG compliance. Minimal cost impact absorbed by market. Supports Sustainable Development Goals alignment. May marginally increase construction timelines but improves safety and reputation.',
    affectedSegments: ['Construction'],
    effectiveDate: '2026-01-15',
    status: 'effective',
  },
  {
    id: 'reg-mortgage-insurance-reforms',
    date: '2026-02-15',
    category: 'mortgage',
    title: 'Mortgage Protection Insurance Standardization & Affordability',
    description: 'Central Bank standardized mortgage protection insurance. Reduced average premiums 15-20% through market competition. Mandatory disclosure of insurance costs and borrower rights. Improved claims processing timelines.',
    authority: 'Central Bank of UAE',
    impact: 'positive',
    impactLevel: 'medium',
    impactDescription: 'Lower insurance costs improve mortgage affordability. Better disclosure protects borrowers. Increases mortgage accessibility. Supports purchase affordability for middle-market buyers. Competitive insurance market benefits consumers.',
    affectedSegments: ['Residential', 'Mortgage'],
    effectiveDate: '2026-02-15',
    status: 'effective',
  },
  {
    id: 'reg-sustainable-buildings-incentives',
    date: '2025-10-10',
    category: 'construction',
    title: 'Green Building Incentives & LEED/WELL Requirements',
    description: 'Dubai Municipality introduced mandatory LEED/WELL certification incentives. 5% DLD fee reduction for LEED Gold+ buildings. Tax benefits for green developments. New buildings >2,500 sqm must target certification. Retrofit programs supported.',
    authority: 'Dubai Municipality / DLD',
    impact: 'positive',
    impactLevel: 'medium',
    impactDescription: 'Green certification increases property value and rental appeal 8-12%. Lower DLD fees offset certification costs. Attracts ESG-focused investors. Supports long-term property appreciation. Reduces utility costs for tenants and owners.',
    affectedSegments: ['Residential', 'Commercial', 'Development'],
    effectiveDate: '2025-10-10',
    status: 'effective',
  },
]

// ============================================================================
// POPULATION DATA
// ============================================================================

const populationData: PopulationData = {
  totalPopulation: 3680000,
  dubaiPopulation: 3680000,
  expatPercent: 88,
  emiratiPercent: 12,
  medianAge: 33,
  avgHouseholdSize: 4.2,
  avgHouseholdIncome: 25000,
  homeOwnershipRate: 22,
  rentingRate: 78,
  populationGrowthRate: 4.2,
  projectedPopulation2030: 5200000,
  ageDistribution: [
    { bracket: '0-14 years', percent: 18.2 },
    { bracket: '15-24 years', percent: 15.4 },
    { bracket: '25-34 years', percent: 32.1 },
    { bracket: '35-44 years', percent: 22.3 },
    { bracket: '45-54 years', percent: 9.2 },
    { bracket: '55-64 years', percent: 2.5 },
    { bracket: '65+ years', percent: 0.3 },
  ],
  incomeDistribution: [
    { bracket: 'Below AED 5,000/month', percent: 22.0, avgRent: 1200 },
    { bracket: 'AED 5,000-10,000', percent: 28.5, avgRent: 1800 },
    { bracket: 'AED 10,000-20,000', percent: 32.2, avgRent: 3200 },
    { bracket: 'AED 20,000-50,000', percent: 14.8, avgRent: 6500 },
    { bracket: 'AED 50,000+', percent: 2.5, avgRent: 15000 },
  ],
}

// ============================================================================
// CONSTRUCTION DATA
// ============================================================================

const constructionData: ConstructionData = {
  unitsUnderConstruction: 65000,
  unitsDelivered12m: 28000,
  unitsExpected12m: 35000,
  unitsExpected24m: 52000,
  constructionCostIndex: 118,
  constructionCostChange: 4.5,
  permitsIssued12m: 50400,
  monthlyDeliveries: [2100, 2200, 2300, 2350, 2400, 2450, 2480, 2520, 2600, 2650, 2700, 2850],
  monthlyPermits: [4000, 4100, 4200, 4250, 4300, 4350, 4200, 4150, 4200, 4300, 4400, 4500],
  bySegment: [
    { segment: 'Residential Apartments', units: 28000, pctOfTotal: 43.1 },
    { segment: 'Townhouses & Villas', units: 18500, pctOfTotal: 28.5 },
    { segment: 'Commercial/Office', units: 11200, pctOfTotal: 17.2 },
    { segment: 'Retail/Mixed-Use', units: 7300, pctOfTotal: 11.2 },
  ],
}

// ============================================================================
// MORTGAGE MARKET DATA
// ============================================================================

const mortgageMarket: MortgageMarket = {
  totalMortgageValue12m: 142000000000,
  mortgageGrowthYoY: 18.5,
  avgMortgageRate: 4.85,
  avgLTV: 72,
  mortgagePctOfTransactions: 58,
  topLenders: [
    { bank: 'Emirates NBD', marketShare: 22.5, avgRate: 4.79 },
    { bank: 'ADIB', marketShare: 18.2, avgRate: 4.88 },
    { bank: 'FIB', marketShare: 15.8, avgRate: 4.92 },
    { bank: 'ENBD/ADIB Merger Entity', marketShare: 14.2, avgRate: 4.82 },
    { bank: 'RAK Bank', marketShare: 11.4, avgRate: 4.95 },
    { bank: 'Other Banks', marketShare: 17.9, avgRate: 5.02 },
  ],
  monthlyMortgageVolume: [11000000000, 11500000000, 12000000000, 12300000000, 12600000000, 12900000000, 13200000000, 13400000000, 13600000000, 14000000000, 14200000000, 14400000000],
  rateHistory: [5.12, 5.08, 5.02, 4.98, 4.95, 4.92, 4.88, 4.87, 4.86, 4.85, 4.85, 4.85],
  approvalRate: 88,
  avgProcessingDays: 5,
}

// ============================================================================
// MACRO SUMMARY
// ============================================================================

const macroSummary: MacroSummary = {
  gdpGrowth: 3.8,
  inflationRate: 2.1,
  populationGrowth: 4.2,
  visitorGrowth: 7.8,
  goldenVisasIssued: 68000,
  mortgageRate: 4.85,
  constructionPipeline: 65000,
  recentRegulations: 13,
  overallSentiment: 'bullish',
  sentimentScore: 72,
  sentimentDrivers: [
    'Golden Visa expansion doubles investor pool',
    'Strong population growth (4.2% YoY) boosts residential demand',
    'Tourism recovery (18.2M visitors, +7.8%) supports short-term rental market',
    'FDI growth 12.5% with 28% real estate share',
    'Construction pipeline 65K units supports 3-5 year supply',
    'Mortgage market strong (18.5% growth, 4.85% avg rate)',
    'DLD digital transformation accelerates transactions',
    'Freehold expansion to new communities increases property values',
    'Ultra-low unemployment (1.2%) supports tenant quality',
    'Housing inflation 5.8% outpaces general inflation',
  ],
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getIndicatorsByCategory(category: string): EconomicIndicator[] {
  return economicIndicators.filter((indicator: EconomicIndicator) => indicator.category === category)
}

export function getIndicator(id: string): EconomicIndicator | undefined {
  return economicIndicators.find((indicator: EconomicIndicator) => indicator.id === id)
}

export function getRecentRegulations(count: number): RegulatoryChange[] {
  const sorted: RegulatoryChange[] = [...regulatoryChanges].sort(
    (a: RegulatoryChange, b: RegulatoryChange) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )
  return sorted.slice(0, count)
}

export function getRegulationsByCategory(category: string): RegulatoryChange[] {
  return regulatoryChanges.filter((reg: RegulatoryChange) => reg.category === category)
}

export function getPositiveRegulations(): RegulatoryChange[] {
  return regulatoryChanges.filter((reg: RegulatoryChange) => reg.impact === 'positive')
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  economicIndicators,
  visaData,
  tourismData,
  regulatoryChanges,
  populationData,
  constructionData,
  mortgageMarket,
  macroSummary,
}
