// PCIS Market Signals — Intelligence Data Layer
// Module 6: Intelligent Alerts — Real-time anomaly detection, pattern recognition, and broker-actionable opportunities

const USE_REAL_SIGNALS = true

// ============================================================================
// INTERFACES
// ============================================================================

export interface MarketSignal {
  id: string
  type: 'price-drop' | 'volume-spike' | 'yield-shift' | 'emerging-area' | 'hot-deal' | 'supply-shock' | 'demand-surge' | 'momentum-shift' | 'arbitrage' | 'seasonal'
  severity: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  area: string
  areaId: string
  building?: string
  detectedDate: string  // ISO
  expiresDate?: string  // some signals are time-sensitive
  isActive: boolean
  confidence: number  // 0-100
  // What triggered it
  triggerMetric: string
  triggerValue: number
  baselineValue: number
  deviationPct: number
  // Actionable
  actionableInsight: string
  targetClients?: string[]  // client profiles this is relevant to
  estimatedUpside?: number  // AED potential gain
  timeToAct?: string  // "48 hours", "1 week", etc
  // Related data
  relatedSignals?: string[]  // IDs of correlated signals
  tags: string[]
}

export interface Opportunity {
  id: string
  signalId: string  // links to MarketSignal
  type: 'buy' | 'sell' | 'hold' | 'watch'
  title: string
  area: string
  areaId: string
  building?: string
  propertyType?: string
  currentPrice: number  // AED/sqft
  targetPrice: number  // estimated fair value or target
  upside: number  // % potential gain
  confidence: number  // 0-100
  timeHorizon: string  // "3 months", "6 months", "12 months"
  rationale: string
  risks: string[]
  clientFit: string[]  // "Value investors", "End users", "Short-term flippers"
  status: 'active' | 'expired' | 'actioned'
  createdDate: string
}

export interface EmergingAreaSignal {
  areaId: string
  area: string
  emergingScore: number  // 0-100 (higher = more emerging)
  phase: 'discovery' | 'early-growth' | 'acceleration' | 'maturing'
  currentPriceSqft: number
  comparableAreaPrice: number  // what a similar but established area prices at
  priceGap: number  // % below comparable
  catalysts: string[]  // what's driving emergence
  risks: string[]
  infrastructure: string[]  // upcoming infra projects
  demandDrivers: string[]
  priceHistory: number[]  // 12 months
  volumeHistory: number[]  // 12 months
  priceVelocity: number  // rate of price change
  volumeVelocity: number  // rate of volume change
  projectedAppreciation12m: number  // %
  comparableArea: string  // the established area used for comparison
}

export interface AreaHeatMetric {
  areaId: string
  area: string
  shortName: string
  // Heat scores (0-100)
  priceHeat: number  // price momentum
  volumeHeat: number  // transaction activity
  demandHeat: number  // search/inquiry demand
  supplyHeat: number  // new supply pressure (inverse: high supply = low heat)
  yieldHeat: number  // rental yield attractiveness
  sentimentHeat: number  // market sentiment
  overallHeat: number  // weighted composite
  // Direction
  heatTrend: 'heating' | 'cooling' | 'stable'
  heatChange30d: number  // change in overall heat
}

export interface MarketPulse {
  date: string
  overallSentiment: 'bullish' | 'bearish' | 'neutral'
  sentimentScore: number  // 0-100
  activeSignals: number
  criticalSignals: number
  topSignal: string  // title of most important signal
  marketMomentum: number  // -100 to +100
  buyerActivity: 'high' | 'medium' | 'low'
  sellerActivity: 'high' | 'medium' | 'low'
  priceDirection: 'up' | 'down' | 'flat'
  volumeDirection: 'up' | 'down' | 'flat'
  // Daily stats
  transactionsToday: number
  totalValueToday: number
  avgPriceSqftToday: number
  // Weekly history
  weeklyMomentum: number[]  // 12 weeks
  weeklySentiment: number[]  // 12 weeks
}

export interface SignalsSummary {
  totalActiveSignals: number
  criticalCount: number
  highCount: number
  mediumCount: number
  lowCount: number
  activeOpportunities: number
  totalEstimatedUpside: number  // AED
  emergingAreas: number
  hottestArea: string
  coolestArea: string
  signalsByType: { type: string; count: number }[]
}

// ============================================================================
// MARKET SIGNALS DATA (30 signals)
// ============================================================================

export const marketSignals: MarketSignal[] = [
  {
    id: 'SIG-001',
    type: 'price-drop',
    severity: 'high',
    title: 'Palm Jumeirah Shoreline 15% Below 90-Day Average',
    description: 'Waterfront properties on Palm Jumeirah showing unusual price weakness compared to 90-day rolling average.',
    area: 'Palm Jumeirah',
    areaId: 'PLM',
    detectedDate: '2026-03-24T08:15:00Z',
    expiresDate: '2026-03-31T23:59:59Z',
    isActive: true,
    confidence: 78,
    triggerMetric: 'Asking Price vs 90-Day Average',
    triggerValue: 4200,
    baselineValue: 4941,
    deviationPct: -15.0,
    actionableInsight: 'Potential entry point for value investors. Recommend immediate portfolio review for waterfront repositioning.',
    targetClients: ['Value Investors', 'End Users'],
    estimatedUpside: 825000,
    timeToAct: '48 hours',
    relatedSignals: ['SIG-015'],
    tags: ['Waterfront', 'Value Play', 'Tactical Entry']
  },
  {
    id: 'SIG-002',
    type: 'price-drop',
    severity: 'medium',
    title: 'Business Bay Executive Towers Correction Signal',
    description: 'Tower prices declining 8% as market reprices commercial real estate exposure.',
    area: 'Business Bay',
    areaId: 'BBY',
    detectedDate: '2026-03-23T14:30:00Z',
    isActive: true,
    confidence: 72,
    triggerMetric: 'Unit Price Index',
    triggerValue: 3650,
    baselineValue: 3967,
    deviationPct: -8.0,
    actionableInsight: 'Extended supply cycle ahead. Monitor buyer sentiment before recommending acquisitions.',
    targetClients: ['Commercial Investors'],
    estimatedUpside: 290000,
    timeToAct: '1 week',
    tags: ['Commercial', 'Correction', 'Monitor']
  },
  {
    id: 'SIG-003',
    type: 'price-drop',
    severity: 'medium',
    title: 'Deira Seaport Precinct Margin Compression',
    description: 'Older units in precinct showing 6% price decline as newer supply nearby attracts buyers.',
    area: 'Deira',
    areaId: 'DTN',
    detectedDate: '2026-03-22T10:45:00Z',
    isActive: true,
    confidence: 65,
    triggerMetric: 'Price per Sqft',
    triggerValue: 1850,
    baselineValue: 1967,
    deviationPct: -6.0,
    actionableInsight: 'Renovation opportunity for portfolio companies. Strategic renovation could recapture 12-15% value.',
    targetClients: ['Development Companies', 'Value Investors'],
    estimatedUpside: 180000,
    timeToAct: '2 weeks',
    tags: ['Renovation Opportunity', 'Supply Pressure']
  },
  {
    id: 'SIG-004',
    type: 'volume-spike',
    severity: 'high',
    title: 'Dubai Hills Transaction Volume Up 45% MoM',
    description: 'Dubai Hills Estate recording unprecedented transaction velocity. Strong buyer momentum across all segments.',
    area: 'Dubai Hills Estate',
    areaId: 'DHL',
    detectedDate: '2026-03-24T16:20:00Z',
    isActive: true,
    confidence: 88,
    triggerMetric: 'Monthly Transaction Count vs 12-Month Avg',
    triggerValue: 312,
    baselineValue: 215,
    deviationPct: 45.0,
    actionableInsight: 'Demand surge in prime residential. Price appreciation likely imminent. Recommend prompt client engagement.',
    targetClients: ['End Users', 'Portfolio Managers'],
    estimatedUpside: 1200000,
    timeToAct: '48 hours',
    relatedSignals: ['SIG-018'],
    tags: ['Volume Surge', 'Demand Signal', 'Bullish']
  },
  {
    id: 'SIG-005',
    type: 'volume-spike',
    severity: 'high',
    title: 'JBR Weekend Sales Surge — Peak Demand Window',
    description: 'Jumeirah Beach Residence showing 68% weekend transaction spike vs weekday average.',
    area: 'Jumeirah Beach Residence',
    areaId: 'JBR',
    detectedDate: '2026-03-23T11:30:00Z',
    isActive: true,
    confidence: 85,
    triggerMetric: 'Weekend Transactions vs Weekday Avg',
    triggerValue: 68,
    baselineValue: 1,
    deviationPct: 68.0,
    actionableInsight: 'Short-term flippers should accelerate listings. Buyer pool exceptionally active.',
    targetClients: ['Short-Term Traders', 'Portfolio Liquidators'],
    estimatedUpside: 450000,
    timeToAct: '3 days',
    tags: ['Trading Window', 'High Volume']
  },
  {
    id: 'SIG-006',
    type: 'volume-spike',
    severity: 'medium',
    title: 'Marina Gate Complex Transaction Activity Doubles',
    description: 'Off-plan conversion driving unique volume spike in Marina Gate complex.',
    area: 'Dubai Marina',
    areaId: 'MRN',
    detectedDate: '2026-03-21T09:15:00Z',
    isActive: true,
    confidence: 74,
    triggerMetric: 'Weekly Deal Count',
    triggerValue: 28,
    baselineValue: 14,
    deviationPct: 100.0,
    actionableInsight: 'Market clearing event due to off-plan completion milestones. Opportunity window closing.',
    targetClients: ['Opportunity Traders'],
    estimatedUpside: 380000,
    timeToAct: '5 days',
    tags: ['Complex Event', 'Temporary Surge']
  },
  {
    id: 'SIG-007',
    type: 'yield-shift',
    severity: 'high',
    title: 'Dubai Marina Rental Yields Hit 7.2% — 18-Month High',
    description: 'Marina rental market showing exceptional yield compression recovery. Rental demand remains strong while prices stabilizing.',
    area: 'Dubai Marina',
    areaId: 'MRN',
    detectedDate: '2026-03-24T13:45:00Z',
    isActive: true,
    confidence: 92,
    triggerMetric: 'Average Rental Yield',
    triggerValue: 7.2,
    baselineValue: 5.8,
    deviationPct: 24.0,
    actionableInsight: 'Exceptional income play. Recommend portfolios shifting from appreciation to yield. Strong renter demand.',
    targetClients: ['Income Investors', 'Pension Funds'],
    estimatedUpside: 950000,
    timeToAct: '1 week',
    relatedSignals: ['SIG-008'],
    tags: ['Income Opportunity', 'Yield Play', 'Bullish']
  },
  {
    id: 'SIG-008',
    type: 'yield-shift',
    severity: 'medium',
    title: 'DIFC Office Yields Compressing Below 5% — Caution Signal',
    description: 'Downtown Finance Centre office yields falling due to price appreciation outpacing rental growth.',
    area: 'Downtown Finance Centre',
    areaId: 'DFC',
    detectedDate: '2026-03-22T15:00:00Z',
    isActive: true,
    confidence: 81,
    triggerMetric: 'Office Rental Yield',
    triggerValue: 4.8,
    baselineValue: 5.5,
    deviationPct: -12.7,
    actionableInsight: 'Yield compression warning. Price appreciation may be ahead of fundamentals. Recommend holding new acquisitions.',
    targetClients: ['Cautious Investors'],
    estimatedUpside: 220000,
    timeToAct: '2 weeks',
    tags: ['Caution Flag', 'Valuation Concern']
  },
  {
    id: 'SIG-009',
    type: 'emerging-area',
    severity: 'high',
    title: 'Dubai South Discovery Phase Momentum Accelerating',
    description: 'Dubai South entering documented discovery phase. Expo legacy catalyzing early institutional interest.',
    area: 'Dubai South',
    areaId: 'DST',
    detectedDate: '2026-03-24T10:30:00Z',
    isActive: true,
    confidence: 87,
    triggerMetric: 'Area Emerging Score',
    triggerValue: 68,
    baselineValue: 45,
    deviationPct: 51.1,
    actionableInsight: 'Ground-floor opportunity. First-mover advantage for value investors. 65% price gap vs comparable areas.',
    targetClients: ['Value Investors', 'Development Companies'],
    estimatedUpside: 2100000,
    timeToAct: '2 weeks',
    relatedSignals: ['SIG-010'],
    tags: ['Emerging Market', 'Early Stage', 'High Potential']
  },
  {
    id: 'SIG-010',
    type: 'emerging-area',
    severity: 'high',
    title: 'Jebel Ali Gateway Early Growth Phase Confirmed',
    description: 'Jebel Ali Gateway transitioning to early-growth phase with infrastructure catalyst buildup.',
    area: 'Jebel Ali Gateway',
    areaId: 'JGE',
    detectedDate: '2026-03-23T14:15:00Z',
    isActive: true,
    confidence: 79,
    triggerMetric: 'Area Phase Transition',
    triggerValue: 1,
    baselineValue: 0,
    deviationPct: 100.0,
    actionableInsight: 'Window opening for second-mover entry before acceleration phase. 70% price gap vs Emirates Hills.',
    targetClients: ['Strategic Investors'],
    estimatedUpside: 1850000,
    timeToAct: '1 month',
    tags: ['Emerging Area', 'Growth Phase']
  },
  {
    id: 'SIG-011',
    type: 'hot-deal',
    severity: 'critical',
    title: 'One Palm 4BR Listed 18% Below Last Comparable',
    description: 'Premium waterfront unit at One Palm priced significantly below recent comparable sales.',
    area: 'Palm Jumeirah',
    areaId: 'PLM',
    building: 'One Palm',
    detectedDate: '2026-03-24T17:45:00Z',
    expiresDate: '2026-03-26T23:59:59Z',
    isActive: true,
    confidence: 94,
    triggerMetric: 'Asking Price vs Recent Comps',
    triggerValue: 7200000,
    baselineValue: 8780000,
    deviationPct: -18.0,
    actionableInsight: 'Urgent broker action required. Price likely to correct upward within 48 hours. High-net-worth client targeting.',
    targetClients: ['HNW Buyers', 'End Users'],
    estimatedUpside: 1576000,
    timeToAct: '48 hours',
    tags: ['Premium Asset', 'Value Pricing', 'Urgency']
  },
  {
    id: 'SIG-012',
    type: 'hot-deal',
    severity: 'critical',
    title: 'Burj Khalifa 2BR at AED 2,800/sqft — Rare Entry Price',
    description: 'Iconic tower 2-bedroom unit listed at historic low per-sqft price. Exceptional investment grade asset.',
    area: 'Downtown Dubai',
    areaId: 'DTN',
    building: 'Burj Khalifa',
    detectedDate: '2026-03-24T12:30:00Z',
    expiresDate: '2026-03-27T23:59:59Z',
    isActive: true,
    confidence: 91,
    triggerMetric: 'Price per Sqft',
    triggerValue: 2800,
    baselineValue: 3420,
    deviationPct: -18.1,
    actionableInsight: 'Rare pricing for flagship asset. Strong hold potential with appreciation. Premium buyer positioning.',
    targetClients: ['Portfolio Managers', 'Collectors'],
    estimatedUpside: 550000,
    timeToAct: '3 days',
    tags: ['Landmark Asset', 'Pricing Anomaly']
  },
  {
    id: 'SIG-013',
    type: 'hot-deal',
    severity: 'high',
    title: 'Emirates Hills 3BR Villa 12% Below Market Rate',
    description: 'Villa community unit attractively positioned against recent transaction comps.',
    area: 'Emirates Hills',
    areaId: 'EHL',
    detectedDate: '2026-03-23T09:20:00Z',
    expiresDate: '2026-03-28T23:59:59Z',
    isActive: true,
    confidence: 83,
    triggerMetric: 'Villa Price vs Market Comps',
    triggerValue: 4850000,
    baselineValue: 5512500,
    deviationPct: -12.0,
    actionableInsight: 'Family visa demand strong in segment. Recommend to end-user client pool.',
    targetClients: ['End Users', 'Family Buyers'],
    estimatedUpside: 582000,
    timeToAct: '1 week',
    tags: ['Villa', 'Family Home']
  },
  {
    id: 'SIG-014',
    type: 'hot-deal',
    severity: 'high',
    title: 'Dubai Hills Plot Opportunity — Land Appreciation Play',
    description: 'Vacant plot with strong development upside as area infrastructure accelerates.',
    area: 'Dubai Hills Estate',
    areaId: 'DHL',
    detectedDate: '2026-03-22T11:00:00Z',
    isActive: true,
    confidence: 77,
    triggerMetric: 'Land Price vs Projected Development Value',
    triggerValue: 3200000,
    baselineValue: 4200000,
    deviationPct: -23.8,
    actionableInsight: 'Strategic land buy for developers. Volume surge in area suggests continued appreciation.',
    targetClients: ['Developers', 'Land Investors'],
    estimatedUpside: 920000,
    timeToAct: '10 days',
    tags: ['Development Opportunity', 'Land Play']
  },
  {
    id: 'SIG-015',
    type: 'supply-shock',
    severity: 'high',
    title: '45,000 Units Delivering in Next 12 Months — Oversupply Risk',
    description: 'Major supply wave hitting market predominantly in Business Bay and suburban areas.',
    area: 'Business Bay',
    areaId: 'BBY',
    detectedDate: '2026-03-24T08:00:00Z',
    isActive: true,
    confidence: 89,
    triggerMetric: 'Pipeline Units vs Current Stock',
    triggerValue: 45000,
    baselineValue: 380000,
    deviationPct: 11.8,
    actionableInsight: 'Recommend price protection strategies. Short-term bearish for high-supply areas. Long-term bullish for quality assets.',
    targetClients: ['Portfolio Managers', 'Risk-Aware Investors'],
    estimatedUpside: -450000,
    timeToAct: '3 weeks',
    relatedSignals: ['SIG-002'],
    tags: ['Supply Risk', 'Caution Flag']
  },
  {
    id: 'SIG-016',
    type: 'supply-shock',
    severity: 'medium',
    title: 'Palm Jumeirah Zero New Supply — Scarcity Premium',
    description: 'Master-planned community with approved no-new-development policy maintaining supply constraint.',
    area: 'Palm Jumeirah',
    areaId: 'PLM',
    detectedDate: '2026-03-23T16:30:00Z',
    isActive: true,
    confidence: 85,
    triggerMetric: 'New Supply Pipeline Units',
    triggerValue: 0,
    baselineValue: 120,
    deviationPct: -100.0,
    actionableInsight: 'Structural supply constraint supports price stability and appreciation. Rare institutional-quality asset.',
    targetClients: ['Value Investors', 'Collectors'],
    estimatedUpside: 750000,
    timeToAct: '4 weeks',
    tags: ['Supply Constraint', 'Structural Support']
  },
  {
    id: 'SIG-017',
    type: 'demand-surge',
    severity: 'high',
    title: 'Russian Buyer Demand Up 60% QoQ',
    description: 'Significant geographical buyer demand surge from Russian market segment.',
    area: 'Dubai Marina',
    areaId: 'MRN',
    detectedDate: '2026-03-24T14:00:00Z',
    isActive: true,
    confidence: 82,
    triggerMetric: 'Russian Buyer Activity Index',
    triggerValue: 160,
    baselineValue: 100,
    deviationPct: 60.0,
    actionableInsight: 'Geographic segment positioning opportunity. Marina and Jumeirah show strongest interest. Premium asset marketing.',
    targetClients: ['High-Net-Worth', 'Premium Segment'],
    estimatedUpside: 1250000,
    timeToAct: '2 weeks',
    tags: ['Buyer Demand', 'Premium Segment']
  },
  {
    id: 'SIG-018',
    type: 'demand-surge',
    severity: 'high',
    title: 'Family Visa Demand Driving 3BR+ in Dubai Hills',
    description: 'Work permit and family visa programs accelerating demand for multi-bedroom family homes.',
    area: 'Dubai Hills Estate',
    areaId: 'DHL',
    detectedDate: '2026-03-23T10:45:00Z',
    isActive: true,
    confidence: 87,
    triggerMetric: 'Family-Size Inquiry Volume',
    triggerValue: 187,
    baselineValue: 112,
    deviationPct: 66.9,
    actionableInsight: 'Strong end-user demand. Multi-bedroom inventory should move rapidly. Recommend pricing accordingly.',
    targetClients: ['End Users', 'Portfolio Managers'],
    estimatedUpside: 920000,
    timeToAct: '1 week',
    relatedSignals: ['SIG-004'],
    tags: ['End-User Demand', 'Family Focus']
  },
  {
    id: 'SIG-019',
    type: 'momentum-shift',
    severity: 'medium',
    title: 'Downtown Momentum Turning Negative After 8 Months Growth',
    description: 'Sustained uptrend reversing. Early warning of market rebalancing in premium core area.',
    area: 'Downtown Dubai',
    areaId: 'DTN',
    detectedDate: '2026-03-24T15:20:00Z',
    isActive: true,
    confidence: 76,
    triggerMetric: '8-Week Momentum Reversal Signal',
    triggerValue: -2.3,
    baselineValue: 5.8,
    deviationPct: -139.7,
    actionableInsight: 'Defensive positioning recommended. Monitor for capitulation before new entry. Hold premium assets.',
    targetClients: ['Cautious Investors'],
    estimatedUpside: -180000,
    timeToAct: '1 week',
    tags: ['Momentum Reversal', 'Caution']
  },
  {
    id: 'SIG-020',
    type: 'momentum-shift',
    severity: 'high',
    title: 'Jebel Ali Gateway Momentum Turning Positive',
    description: 'Emerging area showing accelerating positive momentum with infrastructure catalysts approaching.',
    area: 'Jebel Ali Gateway',
    areaId: 'JGE',
    detectedDate: '2026-03-23T12:15:00Z',
    isActive: true,
    confidence: 84,
    triggerMetric: '12-Week Momentum Acceleration',
    triggerValue: 8.7,
    baselineValue: 2.1,
    deviationPct: 314.3,
    actionableInsight: 'Momentum breakout phase beginning. Window for second-tier entry before major institutional flows.',
    targetClients: ['Growth Investors', 'Emerging Market Specialists'],
    estimatedUpside: 1650000,
    timeToAct: '2 weeks',
    relatedSignals: ['SIG-010'],
    tags: ['Momentum Breakout', 'Growth Signal']
  },
  {
    id: 'SIG-021',
    type: 'arbitrage',
    severity: 'high',
    title: 'Off-Plan vs Resale Gap Widening in Marina — 22% Arbitrage',
    description: 'Developer pricing falling behind resale market, creating structural arbitrage opportunity.',
    area: 'Dubai Marina',
    areaId: 'MRN',
    detectedDate: '2026-03-24T09:45:00Z',
    isActive: true,
    confidence: 88,
    triggerMetric: 'Off-Plan to Resale Price Gap',
    triggerValue: 22.0,
    baselineValue: 8.5,
    deviationPct: 158.8,
    actionableInsight: 'Pure arbitrage play. Acquire off-plan and resell 12-18 months post-completion. Low risk structural opportunity.',
    targetClients: ['Arbitrage Traders', 'Opportunity Specialists'],
    estimatedUpside: 780000,
    timeToAct: '3 weeks',
    tags: ['Arbitrage', 'Structured Play']
  },
  {
    id: 'SIG-022',
    type: 'arbitrage',
    severity: 'medium',
    title: 'Deira Studio/1BR Rental Premium vs Purchase Price',
    description: 'Rental yields creating buyback arbitrage for rental-focused portfolios.',
    area: 'Deira',
    areaId: 'DTN',
    detectedDate: '2026-03-22T13:30:00Z',
    isActive: true,
    confidence: 71,
    triggerMetric: 'Rental Yield Vs Purchase Cap Rate Gap',
    triggerValue: 6.8,
    baselineValue: 4.2,
    deviationPct: 61.9,
    actionableInsight: 'Rent-to-own arbitrage window. Strong rental demand supports acquisition strategy.',
    targetClients: ['Income Investors'],
    estimatedUpside: 420000,
    timeToAct: '4 weeks',
    tags: ['Rental Arbitrage']
  },
  {
    id: 'SIG-023',
    type: 'seasonal',
    severity: 'high',
    title: 'Q2 Seasonal Buying Window Opening — Historically +18% Volume',
    description: 'Seasonal demand pattern activating. Historical data shows 18% volume increase Q2 vs Q1 average.',
    area: 'Dubai Marina',
    areaId: 'MRN',
    detectedDate: '2026-03-24T11:00:00Z',
    expiresDate: '2026-06-30T23:59:59Z',
    isActive: true,
    confidence: 90,
    triggerMetric: 'Seasonal Volume Index',
    triggerValue: 118,
    baselineValue: 100,
    deviationPct: 18.0,
    actionableInsight: 'Seasonal tailwind for sellers. Recommend listing completion before April 15. Buyer momentum strong.',
    targetClients: ['Sellers', 'Portfolio Liquidators'],
    estimatedUpside: 2100000,
    timeToAct: '2 weeks',
    tags: ['Seasonal Pattern', 'Liquidity Window']
  },
  {
    id: 'SIG-024',
    type: 'seasonal',
    severity: 'medium',
    title: 'Summer Holiday Exodus — Expect May-August Liquidity Dip',
    description: 'Approaching seasonal buyer migration. Market liquidity typically compresses 25-35% May-August.',
    area: 'Jumeirah Beach Residence',
    areaId: 'JBR',
    detectedDate: '2026-03-23T08:30:00Z',
    isActive: true,
    confidence: 86,
    triggerMetric: 'Seasonal Liquidity Pattern',
    triggerValue: -30,
    baselineValue: 0,
    deviationPct: -30.0,
    actionableInsight: 'Move sell transactions before May. Buyer pool will be significantly reduced June-August.',
    targetClients: ['Sellers', 'Seasonal Traders'],
    estimatedUpside: -250000,
    timeToAct: '3 weeks',
    tags: ['Seasonal Risk', 'Liquidity Concern']
  },
  {
    id: 'SIG-025',
    type: 'volume-spike',
    severity: 'medium',
    title: 'MBR City Institutional Buyer Activity Detected',
    description: 'Large portfolio buyer activity detected in Mohammed Bin Rashid City.',
    area: 'MBR City',
    areaId: 'MBR',
    detectedDate: '2026-03-22T14:45:00Z',
    isActive: true,
    confidence: 74,
    triggerMetric: 'Large Buyer Portfolio Activity',
    triggerValue: 42,
    baselineValue: 8,
    deviationPct: 425.0,
    actionableInsight: 'Institutional validation of area. Recommend institutional and strategic investor positioning.',
    targetClients: ['Strategic Investors', 'Fund Managers'],
    estimatedUpside: 1100000,
    timeToAct: '2 weeks',
    tags: ['Institutional Activity', 'Validation Signal']
  },
  {
    id: 'SIG-026',
    type: 'price-drop',
    severity: 'low',
    title: 'Deira Commercial Units Micro-Correction',
    description: 'Minor price pullback in commercial units within broader stabilization pattern.',
    area: 'Deira',
    areaId: 'DTN',
    detectedDate: '2026-03-21T10:20:00Z',
    isActive: true,
    confidence: 61,
    triggerMetric: 'Commercial Unit Price',
    triggerValue: 2150,
    baselineValue: 2285,
    deviationPct: -5.9,
    actionableInsight: 'Opportunistic entry for patient buyers. Expect stabilization within 2-3 weeks.',
    targetClients: ['Opportunistic Buyers'],
    estimatedUpside: 145000,
    timeToAct: '2 weeks',
    tags: ['Minor Correction', 'Stabilization']
  },
  {
    id: 'SIG-027',
    type: 'demand-surge',
    severity: 'medium',
    title: 'International Investor Inquiry Spike — 35% MoM',
    description: 'Cross-border investor interest accelerating significantly.',
    area: 'Downtown Dubai',
    areaId: 'DTN',
    detectedDate: '2026-03-23T15:50:00Z',
    isActive: true,
    confidence: 78,
    triggerMetric: 'International Buyer Inquiry Index',
    triggerValue: 135,
    baselineValue: 100,
    deviationPct: 35.0,
    actionableInsight: 'Premium asset marketing to international buyers. Expect pricing pressure upward.',
    targetClients: ['Premium Sellers'],
    estimatedUpside: 680000,
    timeToAct: '1 week',
    tags: ['International Demand', 'Buyer Interest']
  },
  {
    id: 'SIG-028',
    type: 'yield-shift',
    severity: 'medium',
    title: 'EHL Residential Yields Stabilizing at 5.8%',
    description: 'Emirates Hills rental yields finding equilibrium at attractive middle ground.',
    area: 'Emirates Hills',
    areaId: 'EHL',
    detectedDate: '2026-03-22T12:25:00Z',
    isActive: true,
    confidence: 73,
    triggerMetric: 'Residential Rental Yield',
    triggerValue: 5.8,
    baselineValue: 6.2,
    deviationPct: -6.5,
    actionableInsight: 'Balanced yield-appreciation profile. Suitable for mixed return portfolios.',
    targetClients: ['Balanced Investors'],
    estimatedUpside: 385000,
    timeToAct: '3 weeks',
    tags: ['Yield Stabilization', 'Balanced Play']
  },
  {
    id: 'SIG-029',
    type: 'emerging-area',
    severity: 'medium',
    title: 'MBR City Early Growth Phase Validation',
    description: 'Mohammed Bin Rashid City confirming early-growth phase with positive infrastructure catalysts.',
    area: 'MBR City',
    areaId: 'MBR',
    detectedDate: '2026-03-21T11:40:00Z',
    isActive: true,
    confidence: 79,
    triggerMetric: 'Area Maturity Index',
    triggerValue: 48,
    baselineValue: 35,
    deviationPct: 37.1,
    actionableInsight: '45% price gap vs Downtown makes entry attractive. Early institutional validation suggests acceleration phase ahead.',
    targetClients: ['Growth Investors'],
    estimatedUpside: 1500000,
    timeToAct: '3 weeks',
    relatedSignals: ['SIG-025'],
    tags: ['Emerging Area', 'Validation']
  },
  {
    id: 'SIG-030',
    type: 'supply-shock',
    severity: 'low',
    title: 'Dubai South New Retail Supply Coming Online',
    description: 'Retail-focused supply absorption may accelerate with opening of major retail centers.',
    area: 'Dubai South',
    areaId: 'DST',
    detectedDate: '2026-03-20T09:30:00Z',
    isActive: true,
    confidence: 68,
    triggerMetric: 'New Retail Supply Units',
    triggerValue: 185000,
    baselineValue: 120000,
    deviationPct: 54.2,
    actionableInsight: 'Retail supply pressure balanced by demand drivers. Residential remains favorable.',
    targetClients: ['Residential Investors'],
    estimatedUpside: 420000,
    timeToAct: '1 month',
    tags: ['Supply Arrival', 'Absorption Watch']
  }
]

// ============================================================================
// OPPORTUNITIES DATA (12)
// ============================================================================

export const opportunities: Opportunity[] = [
  {
    id: 'OPP-001',
    signalId: 'SIG-011',
    type: 'buy',
    title: 'One Palm 4BR Waterfront Acquisition',
    area: 'Palm Jumeirah',
    areaId: 'PLM',
    building: 'One Palm',
    propertyType: 'Apartment',
    currentPrice: 7200000,
    targetPrice: 8780000,
    upside: 22.0,
    confidence: 94,
    timeHorizon: '12 months',
    rationale: 'Priced 18% below recent comparables. Premium waterfront location with limited supply. Strong hold and appreciation potential for HNW buyers.',
    risks: ['Market correction risk', 'Interest rate sensitivity', 'Liquidity event timing'],
    clientFit: ['HNW Buyers', 'Collectors', 'End Users'],
    status: 'active',
    createdDate: '2026-03-24T17:45:00Z'
  },
  {
    id: 'OPP-002',
    signalId: 'SIG-012',
    type: 'buy',
    title: 'Burj Khalifa 2BR Portfolio Entry',
    area: 'Downtown Dubai',
    areaId: 'DTN',
    building: 'Burj Khalifa',
    propertyType: 'Apartment',
    currentPrice: 2800,
    targetPrice: 3420,
    upside: 22.1,
    confidence: 91,
    timeHorizon: '18 months',
    rationale: 'Iconic asset at rare entry price. Strong institutional demand for landmark properties. Long-term appreciation and rental potential.',
    risks: ['Supply competition from new downtown projects', 'Market sentiment shifts', 'Rental market saturation'],
    clientFit: ['Portfolio Managers', 'Collectors', 'Institutional'],
    status: 'active',
    createdDate: '2026-03-24T12:30:00Z'
  },
  {
    id: 'OPP-003',
    signalId: 'SIG-007',
    type: 'buy',
    title: 'Dubai Marina Income Portfolio Build',
    area: 'Dubai Marina',
    areaId: 'MRN',
    propertyType: 'Mixed Multi-Unit',
    currentPrice: 3200,
    targetPrice: 3850,
    upside: 20.3,
    confidence: 88,
    timeHorizon: '36 months',
    rationale: '7.2% yields + appreciation potential. Exceptional rental demand from international tenants. Income-focused strategy with capital appreciation.',
    risks: ['Rental market cooling', 'Oversupply from new completions', 'Tenant turnover costs'],
    clientFit: ['Income Investors', 'Pension Funds', 'REITs'],
    status: 'active',
    createdDate: '2026-03-24T13:45:00Z'
  },
  {
    id: 'OPP-004',
    signalId: 'SIG-009',
    type: 'buy',
    title: 'Dubai South Ground Floor Entry Strategy',
    area: 'Dubai South',
    areaId: 'DST',
    propertyType: 'Mixed',
    currentPrice: 1850,
    targetPrice: 3100,
    upside: 67.6,
    confidence: 82,
    timeHorizon: '24 months',
    rationale: 'Discovery phase emerging area with 65% upside vs comparables. Expo legacy + airport expansion catalysts. First-mover advantage.',
    risks: ['Slower-than-expected infrastructure execution', 'Buyer sentiment risk', 'Extended absorption period'],
    clientFit: ['Value Investors', 'Growth Investors', 'Developers'],
    status: 'active',
    createdDate: '2026-03-24T10:30:00Z'
  },
  {
    id: 'OPP-005',
    signalId: 'SIG-010',
    type: 'buy',
    title: 'Jebel Ali Gateway Portfolio Accumulation',
    area: 'Jebel Ali Gateway',
    areaId: 'JGE',
    propertyType: 'Residential',
    currentPrice: 1400,
    targetPrice: 2380,
    upside: 70.0,
    confidence: 79,
    timeHorizon: '24 months',
    rationale: 'Early-growth phase momentum breakout. 70% price gap vs Emirates Hills. Infrastructure catalysts approaching. Second-mover entry window.',
    risks: ['Slower infrastructure delivery', 'Market saturation as area matures', 'Competitive supply from new phases'],
    clientFit: ['Growth Investors', 'Value Investors'],
    status: 'active',
    createdDate: '2026-03-23T14:15:00Z'
  },
  {
    id: 'OPP-006',
    signalId: 'SIG-004',
    type: 'buy',
    title: 'Dubai Hills Estate Multi-Bedroom Family Portfolio',
    area: 'Dubai Hills Estate',
    areaId: 'DHL',
    propertyType: '3BR+ Villas & Apartments',
    currentPrice: 4500,
    targetPrice: 5200,
    upside: 15.6,
    confidence: 87,
    timeHorizon: '12 months',
    rationale: 'Family visa demand surge driving 3BR+ velocity. 45% MoM volume increase. Prime end-user absorption.',
    risks: ['Visa policy changes', 'Economic slowdown', 'Expat repatriation risks'],
    clientFit: ['End Users', 'Portfolio Managers', 'Family Buyers'],
    status: 'active',
    createdDate: '2026-03-24T16:20:00Z'
  },
  {
    id: 'OPP-007',
    signalId: 'SIG-021',
    type: 'buy',
    title: 'Marina Off-Plan Arbitrage Structure',
    area: 'Dubai Marina',
    areaId: 'MRN',
    propertyType: 'Off-Plan Units',
    currentPrice: 3200,
    targetPrice: 3900,
    upside: 21.9,
    confidence: 86,
    timeHorizon: '18 months',
    rationale: '22% off-plan to resale gap creates pure arbitrage. Acquire at developer pricing, resell post-completion at market rate.',
    risks: ['Project delays', 'Construction quality risk', 'Market downturn before resale window'],
    clientFit: ['Arbitrage Traders', 'Opportunity Specialists'],
    status: 'active',
    createdDate: '2026-03-24T09:45:00Z'
  },
  {
    id: 'OPP-008',
    signalId: 'SIG-001',
    type: 'hold',
    title: 'Palm Jumeirah Waterfront Hold Strategy',
    area: 'Palm Jumeirah',
    areaId: 'PLM',
    propertyType: 'Waterfront Residential',
    currentPrice: 4200,
    targetPrice: 4800,
    upside: 14.3,
    confidence: 78,
    timeHorizon: '18 months',
    rationale: 'Currently down 15% from 90-day avg but structural supply constraints support recovery. Hold for mean reversion.',
    risks: ['Extended weakness', 'Broader market correction', 'Buyer sentiment deterioration'],
    clientFit: ['Patient Value Investors', 'Long-term Holders'],
    status: 'active',
    createdDate: '2026-03-24T08:15:00Z'
  },
  {
    id: 'OPP-009',
    signalId: 'SIG-019',
    type: 'watch',
    title: 'Downtown Dubai Momentum Watch',
    area: 'Downtown Dubai',
    areaId: 'DTN',
    propertyType: 'Mixed',
    currentPrice: 3100,
    targetPrice: 3400,
    upside: 9.7,
    confidence: 72,
    timeHorizon: '6 months',
    rationale: 'Momentum reversing after 8-month growth. Monitor for capitulation signal. Potential entry after sentiment bottoms.',
    risks: ['Continued downward momentum', 'Confidence erosion', 'Capitulation may be deeper than expected'],
    clientFit: ['Tactical Traders', 'Contrarian Investors'],
    status: 'active',
    createdDate: '2026-03-24T15:20:00Z'
  },
  {
    id: 'OPP-010',
    signalId: 'SIG-025',
    type: 'watch',
    title: 'MBR City Institutional Positioning Watch',
    area: 'MBR City',
    areaId: 'MBR',
    propertyType: 'Residential Mixed',
    currentPrice: 2100,
    targetPrice: 3150,
    upside: 50.0,
    confidence: 74,
    timeHorizon: '24 months',
    rationale: 'Institutional buyer validation emerging. Monitor for acceleration phase confirmation before large deployment.',
    risks: ['Institutional flows may not materialize', 'Area maturation slower than expected', 'Supply shock risk'],
    clientFit: ['Growth Investors', 'Strategic Investors'],
    status: 'active',
    createdDate: '2026-03-22T14:45:00Z'
  },
  {
    id: 'OPP-011',
    signalId: 'SIG-022',
    type: 'buy',
    title: 'Deira Studio Rental Arbitrage Play',
    area: 'Deira',
    areaId: 'DTN',
    propertyType: 'Studio / 1BR',
    currentPrice: 1200,
    targetPrice: 1450,
    upside: 20.8,
    confidence: 71,
    timeHorizon: '36 months',
    rationale: '6.8% rental yields create strong income base. Buyback arbitrage for rental-focused portfolios. Risk-adjusted returns attractive.',
    risks: ['Rental market softening', 'Extended vacancy periods', 'Tenant concentration risk'],
    clientFit: ['Income Investors', 'Rental Specialists'],
    status: 'active',
    createdDate: '2026-03-22T13:30:00Z'
  },
  {
    id: 'OPP-012',
    signalId: 'SIG-014',
    type: 'buy',
    title: 'Dubai Hills Development Land Acquisition',
    area: 'Dubai Hills Estate',
    areaId: 'DHL',
    propertyType: 'Land / Development',
    currentPrice: 3200000,
    targetPrice: 4200000,
    upside: 31.3,
    confidence: 77,
    timeHorizon: '24 months',
    rationale: 'Strategic development plot with strong area momentum. Volume surge suggests continued appreciation. Developer upside.',
    risks: ['Development delays', 'Regulatory changes', 'Market cycle downturn during construction'],
    clientFit: ['Developers', 'Land Investors', 'Strategic Acquirers'],
    status: 'active',
    createdDate: '2026-03-22T11:00:00Z'
  }
]

// ============================================================================
// EMERGING AREA SIGNALS DATA (5)
// ============================================================================

export const emergingAreaSignals: EmergingAreaSignal[] = [
  {
    areaId: 'DST',
    area: 'Dubai South',
    emergingScore: 68,
    phase: 'discovery',
    currentPriceSqft: 1850,
    comparableAreaPrice: 5286,
    priceGap: -65,
    catalysts: ['Expo 2020 Legacy Park infrastructure', 'Al Maktoum International Airport expansion', 'Dubai South master plan execution', 'Industrial corridor development', 'Logistics hub positioning'],
    risks: ['Infrastructure execution delays', 'Slow initial buyer absorption', 'Competitive supply from newer areas', 'Market sentiment risk', 'Airport expansion timeline uncertainty'],
    infrastructure: ['Al Maktoum Airport Phase 2 (2026-2030)', 'Legacy Park completion (Q4 2026)', 'Logistics hub build-out (12-18 months)', 'Retail/entertainment centers', 'Transportation connectivity improvements'],
    demandDrivers: ['Tourism spillover from Expo legacy', 'Logistics employment growth', 'Affordable housing demand', 'Business park attraction', 'International buyer interest'],
    priceHistory: [1650, 1680, 1710, 1740, 1780, 1820, 1850, 1880, 1915, 1950, 1985, 2020],
    volumeHistory: [45, 52, 58, 68, 75, 82, 95, 108, 125, 140, 155, 172],
    priceVelocity: 2.8,
    volumeVelocity: 4.2,
    projectedAppreciation12m: 45,
    comparableArea: 'Downtown Dubai'
  },
  {
    areaId: 'JGE',
    area: 'Jebel Ali Gateway',
    emergingScore: 62,
    phase: 'early-growth',
    currentPriceSqft: 1400,
    comparableAreaPrice: 4667,
    priceGap: -70,
    catalysts: ['Gateway Park master plan expansion', 'Jebel Ali Port modernization', 'Business park tenant acquisition', 'Connectivity improvements', 'Community amenity completion'],
    risks: ['Heavy reliance on port/logistics development', 'Slower-than-expected commercial tenant absorption', 'Supply shock if multiple projects complete simultaneously', 'Economic sensitivity to port activity', 'Extended ramp-up timeline'],
    infrastructure: ['Gateway Park Phase 3 (Under construction)', 'Jebel Ali Port expansion (2026-2028)', 'Internal road network completion', 'Community center & retail facilities', 'School and healthcare facilities'],
    demandDrivers: ['Port worker demand', 'Commercial tenant expansion', 'Logistics cluster development', 'Family visa uptick', 'Gateway retail/entertainment draw'],
    priceHistory: [1200, 1220, 1240, 1260, 1290, 1320, 1350, 1375, 1390, 1395, 1400, 1410],
    volumeHistory: [28, 32, 35, 40, 45, 50, 55, 60, 65, 70, 72, 75],
    priceVelocity: 1.8,
    volumeVelocity: 2.1,
    projectedAppreciation12m: 52,
    comparableArea: 'Emirates Hills'
  },
  {
    areaId: 'MBR',
    area: 'MBR City',
    emergingScore: 54,
    phase: 'early-growth',
    currentPriceSqft: 2100,
    comparableAreaPrice: 3800,
    priceGap: -45,
    catalysts: ['Crescent Pond development completion', 'Mixed-use hub maturation', 'Institutional buyer validation', 'Community amenity buildout', 'Transportation connectivity'],
    risks: ['Higher-than-expected supply', 'Slower mixed-use absorption', 'Market sentiment shifts', 'End-user conversion delays', 'Competitive pressure from established areas'],
    infrastructure: ['Crescent Pond Central Park', 'Retail & entertainment complex', 'Lakefront promenade', 'Internal circulation improvements', 'School and community facilities'],
    demandDrivers: ['Family relocation from core areas', 'Mixed-use lifestyle appeal', 'School availability', 'Spacious living preference', 'Gated community security appeal'],
    priceHistory: [1850, 1880, 1920, 1960, 2000, 2040, 2080, 2090, 2095, 2098, 2100, 2105],
    volumeHistory: [82, 88, 95, 105, 118, 125, 130, 132, 135, 138, 140, 142],
    priceVelocity: 1.4,
    volumeVelocity: 2.3,
    projectedAppreciation12m: 38,
    comparableArea: 'Downtown Dubai'
  },
  {
    areaId: 'DHL',
    area: 'Dubai Hills Estate',
    emergingScore: 72,
    phase: 'acceleration',
    currentPriceSqft: 4500,
    comparableAreaPrice: 3850,
    priceGap: 17,
    catalysts: ['Family visa program growth', 'School cluster expansion', 'Community infrastructure completion', 'Retail/entertainment hub activation', 'Transportation hub connectivity'],
    risks: ['Price acceleration may outpace fundamentals', 'Visa policy changes', 'Economic downturn', 'New supply in adjacent areas', 'Buyer sentiment reversal'],
    infrastructure: ['Hills Mall expansion', 'International schools (multiple locations)', 'Parks & green spaces completion', 'Medical facilities', 'Sports & leisure facilities'],
    demandDrivers: ['Family visa demand surge', 'Premium school availability', 'Secure gated community appeal', 'Villa community lifestyle', 'International community clustering'],
    priceHistory: [3850, 3920, 3990, 4080, 4150, 4220, 4320, 4400, 4450, 4480, 4500, 4520],
    volumeHistory: [180, 195, 210, 235, 255, 280, 295, 305, 312, 315, 318, 320],
    priceVelocity: 5.4,
    volumeVelocity: 3.8,
    projectedAppreciation12m: 22,
    comparableArea: 'Downtown Dubai'
  },
  {
    areaId: 'PLM',
    area: 'Palm Jumeirah',
    emergingScore: 85,
    phase: 'maturing',
    currentPriceSqft: 4200,
    comparableAreaPrice: 3850,
    priceGap: 9,
    catalysts: ['Iconic status stabilization', 'Zero new supply policy', 'Ultra-premium positioning', 'Collector/HNW demand', 'Scarcity premium maintenance'],
    risks: ['Global economic downturn', 'Luxury market correction', 'Extended absorption on new listings', 'HNW buyer sentiment risk', 'Geopolitical tensions'],
    infrastructure: ['Waterfront amenity enhancement', 'Marina facility upgrades', 'Community center activation', 'Beach club operations', 'Security/access systems'],
    demandDrivers: ['Ultra-HNW buyer demand', 'Collector/icon status', 'Limited supply premium', 'Waterfront exclusivity', 'Legacy asset positioning'],
    priceHistory: [3600, 3680, 3750, 3820, 3900, 3985, 4080, 4140, 4170, 4185, 4200, 4210],
    volumeHistory: [25, 26, 27, 28, 29, 30, 31, 31, 32, 32, 33, 33],
    priceVelocity: 4.2,
    volumeVelocity: 0.4,
    projectedAppreciation12m: 12,
    comparableArea: 'Downtown Dubai'
  }
]

// ============================================================================
// AREA HEAT METRICS DATA (11 areas)
// ============================================================================

export const areaHeatMetrics: AreaHeatMetric[] = [
  { areaId: 'PLM', area: 'Palm Jumeirah', shortName: 'Palm', priceHeat: 72, volumeHeat: 45, demandHeat: 78, supplyHeat: 15, yieldHeat: 62, sentimentHeat: 85, overallHeat: 76, heatTrend: 'stable', heatChange30d: 2 },
  { areaId: 'MRN', area: 'Dubai Marina', shortName: 'Marina', priceHeat: 68, volumeHeat: 82, demandHeat: 85, supplyHeat: 58, yieldHeat: 88, sentimentHeat: 79, overallHeat: 77, heatTrend: 'heating', heatChange30d: 8 },
  { areaId: 'DTN', area: 'Downtown Dubai', shortName: 'Downtown', priceHeat: 65, volumeHeat: 72, demandHeat: 80, supplyHeat: 65, yieldHeat: 58, sentimentHeat: 62, overallHeat: 68, heatTrend: 'cooling', heatChange30d: -5 },
  { areaId: 'EHL', area: 'Emirates Hills', shortName: 'Emirates Hills', priceHeat: 71, volumeHeat: 68, demandHeat: 75, supplyHeat: 35, yieldHeat: 72, sentimentHeat: 78, overallHeat: 70, heatTrend: 'stable', heatChange30d: 1 },
  { areaId: 'BBY', area: 'Business Bay', shortName: 'Business Bay', priceHeat: 48, volumeHeat: 55, demandHeat: 62, supplyHeat: 85, yieldHeat: 45, sentimentHeat: 42, overallHeat: 56, heatTrend: 'cooling', heatChange30d: -8 },
  { areaId: 'DHL', area: 'Dubai Hills Estate', shortName: 'Dubai Hills', priceHeat: 85, volumeHeat: 88, demandHeat: 92, supplyHeat: 45, yieldHeat: 72, sentimentHeat: 88, overallHeat: 82, heatTrend: 'heating', heatChange30d: 12 },
  { areaId: 'DFC', area: 'Downtown Finance Centre', shortName: 'DIFC', priceHeat: 62, volumeHeat: 58, demandHeat: 65, supplyHeat: 72, yieldHeat: 35, sentimentHeat: 52, overallHeat: 57, heatTrend: 'cooling', heatChange30d: -6 },
  { areaId: 'DST', area: 'Dubai South', shortName: 'Dubai South', priceHeat: 42, volumeHeat: 35, demandHeat: 48, supplyHeat: 25, yieldHeat: 58, sentimentHeat: 55, overallHeat: 44, heatTrend: 'heating', heatChange30d: 18 },
  { areaId: 'JBR', area: 'Jumeirah Beach Residence', shortName: 'JBR', priceHeat: 74, volumeHeat: 78, demandHeat: 82, supplyHeat: 62, yieldHeat: 78, sentimentHeat: 75, overallHeat: 75, heatTrend: 'heating', heatChange30d: 6 },
  { areaId: 'MBR', area: 'MBR City', shortName: 'MBR City', priceHeat: 58, volumeHeat: 62, demandHeat: 68, supplyHeat: 45, yieldHeat: 65, sentimentHeat: 62, overallHeat: 60, heatTrend: 'heating', heatChange30d: 10 },
  { areaId: 'JGE', area: 'Jebel Ali Gateway', shortName: 'Jebel Ali', priceHeat: 52, volumeHeat: 48, demandHeat: 55, supplyHeat: 38, yieldHeat: 62, sentimentHeat: 58, overallHeat: 52, heatTrend: 'heating', heatChange30d: 15 }
]

// ============================================================================
// MARKET PULSE
// ============================================================================

export const marketPulse: MarketPulse = {
  date: '2026-03-24T17:30:00Z',
  overallSentiment: 'bullish',
  sentimentScore: 72,
  activeSignals: 28,
  criticalSignals: 3,
  topSignal: 'One Palm 4BR Listed 18% Below Last Comparable',
  marketMomentum: 28,
  buyerActivity: 'high',
  sellerActivity: 'medium',
  priceDirection: 'up',
  volumeDirection: 'up',
  transactionsToday: 312,
  totalValueToday: 1850000000,
  avgPriceSqftToday: 3420,
  weeklyMomentum: [18, 22, 28, 31, 35, 38, 40, 42, 40, 38, 35, 28],
  weeklySentiment: [55, 58, 62, 65, 68, 70, 72, 73, 72, 70, 68, 72]
}

// ============================================================================
// SIGNALS SUMMARY
// ============================================================================

export const signalsSummary: SignalsSummary = {
  totalActiveSignals: 28,
  criticalCount: 2,
  highCount: 12,
  mediumCount: 10,
  lowCount: 4,
  activeOpportunities: 11,
  totalEstimatedUpside: 14385000,
  emergingAreas: 5,
  hottestArea: 'Dubai Hills Estate',
  coolestArea: 'Dubai South',
  signalsByType: [
    { type: 'price-drop', count: 3 },
    { type: 'volume-spike', count: 4 },
    { type: 'yield-shift', count: 3 },
    { type: 'emerging-area', count: 3 },
    { type: 'hot-deal', count: 4 },
    { type: 'supply-shock', count: 2 },
    { type: 'demand-surge', count: 3 },
    { type: 'momentum-shift', count: 2 },
    { type: 'arbitrage', count: 2 },
    { type: 'seasonal', count: 2 }
  ]
}

// ============================================================================
// REAL DATA OVERLAY
// ============================================================================

import {
  REAL_MARKET_SIGNALS,
  REAL_OPPORTUNITIES,
  REAL_EMERGING_AREAS,
  REAL_HEAT_METRICS,
  REAL_MARKET_PULSE,
  REAL_SIGNALS_SUMMARY,
} from './realSignalsData'

// Override mock data with real computed signals when flag is on
if (USE_REAL_SIGNALS) {
  marketSignals.length = 0
  marketSignals.push(...(REAL_MARKET_SIGNALS as any[]))
  opportunities.length = 0
  opportunities.push(...(REAL_OPPORTUNITIES as any[]))
  emergingAreaSignals.length = 0
  emergingAreaSignals.push(...(REAL_EMERGING_AREAS as any[]))
  areaHeatMetrics.length = 0
  areaHeatMetrics.push(...(REAL_HEAT_METRICS as any[]))
  Object.assign(marketPulse, REAL_MARKET_PULSE)
  Object.assign(signalsSummary, REAL_SIGNALS_SUMMARY)
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getActiveSignals(): MarketSignal[] {
  return marketSignals.filter(signal => signal.isActive)
}

export function getSignalsByType(type: MarketSignal['type']): MarketSignal[] {
  return marketSignals.filter(signal => signal.type === type && signal.isActive)
}

export function getSignalsByArea(areaId: string): MarketSignal[] {
  return marketSignals.filter(signal => signal.areaId === areaId && signal.isActive)
}

export function getCriticalSignals(): MarketSignal[] {
  return marketSignals.filter(signal => signal.severity === 'critical' && signal.isActive)
}

export function getActiveOpportunities(): Opportunity[] {
  return opportunities.filter(opp => opp.status === 'active')
}

export function getEmergingAreas(): EmergingAreaSignal[] {
  return emergingAreaSignals.filter(
    area => area.phase === 'discovery' || area.phase === 'early-growth'
  )
}

export function getHeatMetrics(): AreaHeatMetric[] {
  return areaHeatMetrics
}

export function getAreaHeat(areaId: string): AreaHeatMetric | undefined {
  return areaHeatMetrics.find(metric => metric.areaId === areaId)
}
