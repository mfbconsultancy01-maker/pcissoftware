'use client'

import { useState, useMemo } from 'react'
import {
  clients, properties, matches, matchStages, recommendations, advisorPerformance,
  engagementMetrics, areaMetrics, marketMetrics, macroIndicators, supplyDemandByArea,
  getClient, getProperty, getEngagement, getClientMatches,
  type Client, type MatchWithStage,
} from '@/lib/mockData'

// ============================================================
// TYPES — Match-Driven Report Architecture
// ============================================================
type ReportType = 'opportunity' | 'investment' | 'portfolio' | 'negotiation' | 'comparative' | 'reengagement'
type ReportStatus = 'ready' | 'generating' | 'scheduled'

interface MatchReport {
  id: string
  title: string
  type: ReportType
  status: ReportStatus
  generatedAt: string
  description: string
  pages: number
  // The core link: client ↔ opportunity
  clientId: string
  propertyIds: string[]   // one or more matched properties
  matchIds: string[]      // the engine matches that triggered this report
  grade: string           // highest match grade
  score: number           // highest match score
  // Structured sections for broker use
  whyThisMatch: string
  clientInsight: string
  financialCase: string
  brokerAction: string
  keyMetrics: { label: string; value: string; color?: string }[]
}

const reportTypeConfig: Record<ReportType, { label: string; color: string; icon: string; description: string }> = {
  opportunity:    { label: 'Opportunity Brief',     color: '#d4a574', icon: '★', description: 'Present a single matched property to a client' },
  investment:     { label: 'Investment Case',       color: '#22c55e', icon: '$', description: 'ROI-focused analysis for analytical clients' },
  portfolio:      { label: 'Portfolio Proposal',    color: '#3b82f6', icon: '◆', description: 'Multi-property recommendation for one client' },
  negotiation:    { label: 'Negotiation Playbook',  color: '#f59e0b', icon: '⚡', description: 'Active deal strategy and counter-offer modeling' },
  comparative:    { label: 'Comparative Analysis',  color: '#a78bfa', icon: '⇄', description: 'Side-by-side property comparison for a client' },
  reengagement:   { label: 'Re-Engagement Brief',   color: '#ef4444', icon: '↻', description: 'Strategy to re-activate a cooling client' },
}

// ============================================================
// MATCH-DRIVEN REPORTS — Every report links opportunity → client
// ============================================================
const matchReports: MatchReport[] = [
  {
    id: 'rpt1',
    title: 'Palm Villa #8 — Trophy Acquisition Brief',
    type: 'opportunity',
    status: 'ready',
    generatedAt: '2026-03-07T10:00:00Z',
    pages: 14,
    clientId: 'c1',
    propertyIds: ['p1'],
    matchIds: ['m1'],
    grade: 'A+',
    score: 0.91,
    description: 'Client presentation package for Ahmed Al Maktoum. Palm Villa #8 is the only property satisfying all three non-negotiable criteria: waterfront with private beach, cinema room (wife\'s requirement), and sub-AED 200M in the Palm Jumeirah trophy corridor.',
    whyThisMatch: 'Of 847 active listings scanned, only 3 met all filters. Palm Villa #8 scored highest by 14pts due to the cinema room — directly tied to family buy-in from the March 1 meeting.',
    clientInsight: 'Decisive trophy buyer. Decision Velocity 90/100. 4 viewings in 72 hours = "Imminent Purchase" pattern at 89% confidence. Wife showed strong emotional response to cinema room.',
    financialCase: 'AED 185M at 74% of AED 250M budget. Comparable Palm villas averaged AED 195M in Q1. The 7-bed configuration commands 12% resale premium. Room for AED 180M opening offer.',
    brokerAction: 'Present formal offer package within 48 hours. Lead with cinema room and family lifestyle narrative. Prepare AED 180M opening offer, settling expectation AED 183-185M.',
    keyMetrics: [
      { label: 'Match Score', value: '91%', color: '#22c55e' },
      { label: 'Client Readiness', value: '0.89', color: '#d4a574' },
      { label: 'Asking Price', value: 'AED 185M' },
      { label: 'Budget Usage', value: '74%', color: '#3b82f6' },
      { label: 'Days to Close (Est.)', value: '8-12', color: '#f59e0b' },
      { label: 'Comparable Avg', value: 'AED 195M' },
    ],
  },
  {
    id: 'rpt2',
    title: 'Al Maktoum Portfolio — Dual Property Strategy',
    type: 'portfolio',
    status: 'ready',
    generatedAt: '2026-03-06T14:00:00Z',
    pages: 18,
    clientId: 'c1',
    propertyIds: ['p1', 'p3'],
    matchIds: ['m1', 'm2'],
    grade: 'A+',
    score: 0.91,
    description: 'Strategic portfolio proposal for Ahmed Al Maktoum combining Palm Villa #8 (primary target, A+) and Emirates Hills Estate (strategic backup, A). Includes sequencing strategy: present Palm first, hold Emirates Hills as leverage if negotiation stalls.',
    whyThisMatch: 'Two complementary opportunities at trophy level. Palm Villa is the primary close target. Emirates Hills provides negotiation leverage and covers the "portfolio legacy" positioning if budget discussions arise.',
    clientInsight: 'Al Maktoum responds to decisive action. Do NOT present both properties simultaneously — this creates decision paralysis. Palm first, Emirates only if needed.',
    financialCase: 'Combined pipeline: AED 405M. Palm at AED 185M (74% budget), Emirates at AED 220M (88% budget). Emirates Hills appreciated 18% in 2025, outpacing Palm by 3pp.',
    brokerAction: 'Lead with Palm Villa. Only introduce Emirates Hills if Palm negotiations stall. Position it as "an opportunity that just surfaced" to maintain acquisition momentum.',
    keyMetrics: [
      { label: 'Properties', value: '2 matched' },
      { label: 'Top Grade', value: 'A+', color: '#22c55e' },
      { label: 'Combined Value', value: 'AED 405M' },
      { label: 'Primary Target', value: 'Palm Villa #8', color: '#d4a574' },
      { label: 'Backup Available', value: 'Yes', color: '#3b82f6' },
      { label: 'Client Momentum', value: 'Peak', color: '#f59e0b' },
    ],
  },
  {
    id: 'rpt3',
    title: 'Marina Penthouse 42 — Investment Case for Chen Wei',
    type: 'investment',
    status: 'ready',
    generatedAt: '2026-03-05T10:00:00Z',
    pages: 12,
    clientId: 'c2',
    propertyIds: ['p2'],
    matchIds: ['m3'],
    grade: 'A',
    score: 0.79,
    description: 'Bloomberg-grade investment analysis for Chen Wei. This client requires exhaustive ROI data before committing. Report includes rental yield matrix, comparable analysis, 3-year appreciation model, and direct comparison against his Shanghai portfolio returns.',
    whyThisMatch: 'Chen Wei submitted 6 rental yield requests in 14 days, all focused on waterfront high-rises >5% gross yield. This penthouse delivers 5.8% — the highest among 312 investment-grade Marina units scanned.',
    clientInsight: 'Analytical archetype. Detail Orientation 95/100, Decision Velocity 35/100. He will NOT commit without exhaustive data. Expect 3-4 week evaluation cycle. Do not rush — he abandons advisors who apply premature pressure.',
    financialCase: 'AED 52M at 34.6% of AED 150M budget. Gross yield 5.8%, net 4.1%. Outperforms Marina avg (4.8%) and his Shanghai portfolio (3.2%) by 180bps. 36-month appreciation: +11.3%.',
    brokerAction: 'Send complete ROI matrix within 24 hours: comparable yields, occupancy rates, service charges, 3-year scenarios. Include Shanghai portfolio comparison. Schedule viewing ONLY after documentation review.',
    keyMetrics: [
      { label: 'Gross Yield', value: '5.8%', color: '#22c55e' },
      { label: 'Net Yield', value: '4.1%' },
      { label: 'vs Shanghai', value: '+180bps', color: '#22c55e' },
      { label: '36m Appreciation', value: '+11.3%', color: '#3b82f6' },
      { label: 'Budget Used', value: '34.6%' },
      { label: 'Decision Timeline', value: '3-4 weeks', color: '#f59e0b' },
    ],
  },
  {
    id: 'rpt4',
    title: 'Jumeirah Bay Mansion — Dubois Negotiation Playbook',
    type: 'negotiation',
    status: 'ready',
    generatedAt: '2026-03-04T16:00:00Z',
    pages: 10,
    clientId: 'c7',
    propertyIds: ['p10'],
    matchIds: ['m8'],
    grade: 'A+',
    score: 0.88,
    description: 'Active negotiation strategy for Marc Dubois on Jumeirah Bay Mansion. Current impasse: AED 160M (client) vs AED 170M (seller). This report models the furniture package bridge strategy and maps the network effect that could catalyze the Al Maktoum deal.',
    whyThisMatch: 'Only property with island exclusivity + private marine dock + sub-AED 175M. His 65-foot yacht requires private dock (confirmed via marina records). Scarcity: only 2 of 12 Jumeirah Bay waterfront mansions available.',
    clientInsight: 'Decisive archetype (Decision Velocity 90/100). Negotiates firmly but seeks win-win. Referred Francois Leclerc unprompted = deep trust signal. Daughter enrolling at Dubai school Sept 2026 = family relocation urgency.',
    financialCase: 'AED 160M vs AED 170M gap. Bridge strategy: furniture + art package (AED 8-10M) included at AED 165M headline. His AED 380M portfolio supports easily. CRITICAL: Dubois connected to Al Maktoum via Monaco Yacht Club — a close here could trigger the Palm Villa deal (combined AED 345M).',
    brokerAction: 'Present AED 165M with furniture package as "final best offer" this week. Frame: "We secured AED 5M in premium furnishings at no additional cost." Emphasize school enrollment deadline. If closed, immediately prepare Al Maktoum social proof presentation.',
    keyMetrics: [
      { label: 'Client Offer', value: 'AED 160M' },
      { label: 'Seller Ask', value: 'AED 170M' },
      { label: 'Bridge Strategy', value: 'AED 165M', color: '#22c55e' },
      { label: 'Close Probability', value: '72%', color: '#f59e0b' },
      { label: 'Network Effect', value: 'AED 345M', color: '#d4a574' },
      { label: 'Days Active', value: '6 of 10', color: '#ef4444' },
    ],
  },
  {
    id: 'rpt5',
    title: 'Marina Penthouse — Moretti Lifestyle Opportunity',
    type: 'opportunity',
    status: 'ready',
    generatedAt: '2026-03-04T11:00:00Z',
    pages: 8,
    clientId: 'c10',
    propertyIds: ['p2'],
    matchIds: ['m4'],
    grade: 'A',
    score: 0.78,
    description: 'Lifestyle-focused opportunity brief for Sofia Moretti. Behavioral signals indicate deep emotional attachment: 2 visits in 10 days, 55+ minutes each, asked about custom furnishing and curtain fabrics. Engine classifies this as "emotional anchoring" — precedes purchase in 73% of lifestyle buyer transactions.',
    whyThisMatch: 'No other property in her pipeline has triggered repeat-visit behavior. She photographed the kitchen 3x, lingered at the terrace, discussed hosting dinner parties. She is mentally moved in.',
    clientInsight: 'Impulsive lifestyle buyer. Emotional Driver 85/100, Decision Velocity 95/100. She brought a friend to the second viewing who also expressed enthusiasm (Social Proof catalyst). Once she decides, she moves fast. Risk is delay, not haste.',
    financialCase: 'AED 52M at 86.6% of AED 60M stated budget. However, partner\'s CEO promotion last month projects +30-40% household income. Family office in Milan: AED 180M liquid. Real purchasing power far exceeds stated budget.',
    brokerAction: 'Do NOT show alternatives — emotional attachment gets diluted by comparison. Present curated furnishing package with 3 interior design options. Frame next step as "securing your home." Move to offer within 48 hours of third visit.',
    keyMetrics: [
      { label: 'Emotional Anchoring', value: 'Confirmed', color: '#22c55e' },
      { label: 'Visits (10 days)', value: '2 × 55min', color: '#d4a574' },
      { label: 'Decision Velocity', value: '95/100', color: '#f59e0b' },
      { label: 'Asking Price', value: 'AED 52M' },
      { label: 'Purchase Signal', value: '73% pattern', color: '#22c55e' },
      { label: 'Action Window', value: '48 hours', color: '#ef4444' },
    ],
  },
  {
    id: 'rpt6',
    title: 'Bluewaters Penthouse — Van der Berg Lifestyle Upgrade',
    type: 'opportunity',
    status: 'ready',
    generatedAt: '2026-03-03T12:00:00Z',
    pages: 10,
    clientId: 'c6',
    propertyIds: ['p5'],
    matchIds: ['m6'],
    grade: 'A',
    score: 0.80,
    description: 'Opportunity brief for Pieter Van der Berg following his budget expansion event. Originally AED 40-60M, expanded to AED 60-80M within one week after attending a Bluewaters developer event. This property\'s resort-living concept directly activates his Status Orientation (90/100) and emotional drivers.',
    whyThisMatch: 'Van der Berg pivoted from investor to lifestyle buyer after the developer event. His mention of "wanting a place that impresses my clients" reveals dual motivation: personal lifestyle + business hospitality. Bluewaters\' celebrity dining and beach club serve both.',
    clientInsight: 'Impulsive archetype. Emotional Driver 85/100, Status Orientation 90/100. Responds to aspirational lifestyle, NOT ROI calculations. Cape Town penthouse sold for AED 45M last quarter = freed liquidity. Commitment window: 2 weeks before enthusiasm fades.',
    financialCase: 'AED 75M at midpoint of expanded range. Portfolio AED 320M. Bluewaters appreciated 22% since Ain Dubai opening, limited new supply. Rental potential during absence: AED 800K/year through hotel operator program.',
    brokerAction: 'Arrange sunset viewing with dinner at Bluewaters beach club. Lead with experience, not numbers. Mention the client-entertainment angle he raised. Do NOT present ROI data unless asked. Move toward offer within 10 days.',
    keyMetrics: [
      { label: 'Budget Expansion', value: '+40%', color: '#22c55e' },
      { label: 'Status Orientation', value: '90/100', color: '#d4a574' },
      { label: 'Asking Price', value: 'AED 75M' },
      { label: 'Momentum', value: '7.0 sig/wk', color: '#f59e0b' },
      { label: 'Enthusiasm Window', value: '~2 weeks', color: '#ef4444' },
      { label: 'Appreciation', value: '+22% YTD', color: '#22c55e' },
    ],
  },
  {
    id: 'rpt7',
    title: 'Downtown #4 — Dr. Kim Counter-Offer Strategy',
    type: 'negotiation',
    status: 'ready',
    generatedAt: '2026-03-03T15:00:00Z',
    pages: 8,
    clientId: 'c11',
    propertyIds: ['p4'],
    matchIds: ['m7'],
    grade: 'A+',
    score: 0.86,
    description: 'Counter-offer strategy for Dr. Sarah Kim on Downtown Residences #4. She submitted AED 45M offer with pre-qualification docs. Her analytical archetype demands a data-backed counter at AED 46M with full justification package.',
    whyThisMatch: 'Best Burj Khalifa view angle (direct frontage floors 45-52), highest finish spec (Italian marble, Gaggenau), competitive pricing at AED 45M. Ranked #1 of 28 Downtown units against her weighted criteria.',
    clientInsight: 'Analytical archetype approaching this like a medical research protocol. Pre-commitment signals confirmed: call duration +40%, unprompted doc submission, questions escalating to unit-specific details (HVAC specs, ceiling heights). Close probability: 78% within 10 days.',
    financialCase: 'AED 45M offer at 45% of AED 100M budget. Downtown appreciation 14.2% over 36m. Comparable units: AED 42-48M. Counter-tolerance modeled at AED 46.5M based on negotiation style score (60/100). Seoul trip March 18 = natural deadline.',
    brokerAction: 'Counter at AED 46M with justification: 3 comparable transactions, view premium analysis, appreciation forecast. Include building specs she hasn\'t yet requested — she respects advisors who anticipate her data needs. Do not negotiate emotionally.',
    keyMetrics: [
      { label: 'Client Offer', value: 'AED 45M' },
      { label: 'Target Counter', value: 'AED 46M', color: '#22c55e' },
      { label: 'Close Probability', value: '78%', color: '#f59e0b' },
      { label: 'Budget Usage', value: '45%' },
      { label: 'Seoul Deadline', value: 'Mar 18', color: '#ef4444' },
      { label: '36m Appreciation', value: '+14.2%', color: '#3b82f6' },
    ],
  },
  {
    id: 'rpt8',
    title: 'Patel Pivot — Creek Harbour vs Al Barari Comparison',
    type: 'comparative',
    status: 'ready',
    generatedAt: '2026-03-02T11:00:00Z',
    pages: 10,
    clientId: 'c12',
    propertyIds: ['p7', 'p8'],
    matchIds: ['m11'],
    grade: 'B',
    score: 0.62,
    description: 'Comparative analysis for Priya Patel after negative noise signal at Creek Harbour viewing. Engine identified Al Barari Sanctuary as 22% stronger fit on wellness dimensions. This report positions the pivot as proactive advisory, not a failure of the original match.',
    whyThisMatch: 'Creek Harbour viewing detected noise concerns (active construction within 500m through 2027). Her wellness priorities (yoga, green spaces, quiet) misalign with the current environment. Al Barari: zero construction within 1km, tropical gardens, ambient noise 40% lower.',
    clientInsight: 'Balanced archetype with strong wellness orientation. Her noise sensitivity is genuine, not a negotiation tactic (3 follow-up questions about construction timelines). 14 days silent since viewing — momentum stalled, engagement velocity dropped from 3.2 to 1.1 signals/week.',
    financialCase: 'Creek Harbour AED 18M at 60% budget vs Al Barari AED 28M at 93% budget. Creek units near construction traded at 6-8% discount. Al Barari offers stronger value-per-sqft with no construction risk.',
    brokerAction: 'Present side-by-side comparison: noise profiles, wellness amenities, 3-year construction overlay. Position as: "After your feedback, we identified something better aligned with your wellness priorities." Schedule Al Barari viewing within 7 days.',
    keyMetrics: [
      { label: 'Creek Harbour Fit', value: '60%', color: '#ef4444' },
      { label: 'Al Barari Fit', value: '+22% better', color: '#22c55e' },
      { label: 'Noise Difference', value: '-40%', color: '#22c55e' },
      { label: 'Days Silent', value: '14', color: '#f59e0b' },
      { label: 'Creek Price', value: 'AED 18M' },
      { label: 'Al Barari Price', value: 'AED 28M' },
    ],
  },
  {
    id: 'rpt9',
    title: 'Petrova Re-Engagement — Al Barari Recovery Strategy',
    type: 'reengagement',
    status: 'ready',
    generatedAt: '2026-02-27T14:00:00Z',
    pages: 6,
    clientId: 'c3',
    propertyIds: ['p8'],
    matchIds: ['m12'],
    grade: 'B',
    score: 0.58,
    description: 'CRITICAL: Elena Petrova has been silent 18 days. Engagement will drop below recovery threshold by March 22 if no intervention. This brief maps the re-engagement strategy through the Ivanov connection and positions Al Barari Sanctuary as the eventual match.',
    whyThisMatch: 'Al Barari Sanctuary is the strongest lifestyle fit at 72% for her wellness profile (nature-seeking, privacy-oriented, spa-focused). But this match CANNOT be presented yet — doing so in current state risks appearing tone-deaf to her silence.',
    clientInsight: 'Cautious archetype — hardest to close. Trust Formation 40/100, Risk Tolerance 25/100, Decision Velocity 25/100. Her silence = "Analysis Paralysis" (71% confidence), NOT disinterest. AED 42M may exceed her true comfort zone (AED 25-35M). Ivanov connection (influence 0.75) is the safest re-engagement channel.',
    financialCase: 'AED 42M at 93% of stated maximum but likely above true comfort. Consider AED 28-32M Al Barari alternatives that serve wellness needs without financial anxiety. Financial anxiety compounds decision paralysis for this archetype.',
    brokerAction: 'Step 1: Personal call within 5 days, no property mention. Ask about wellness retreat plans. Step 2: If positive response, offer low-commitment virtual Al Barari tour. Step 3: Only present formal match after engagement signals resume. Use Ivanov connection for organic social setting if possible.',
    keyMetrics: [
      { label: 'Days Silent', value: '18', color: '#ef4444' },
      { label: 'Decay Rate', value: '-64%', color: '#ef4444' },
      { label: 'Recovery Deadline', value: 'Mar 22', color: '#f59e0b' },
      { label: 'Pattern', value: 'Analysis Paralysis' },
      { label: 'Ivanov Influence', value: '0.75', color: '#a78bfa' },
      { label: 'Trust Formation', value: '40/100', color: '#ef4444' },
    ],
  },
  {
    id: 'rpt10',
    title: 'DIFC Tower — Williams Institutional Dossier',
    type: 'investment',
    status: 'ready',
    generatedAt: '2026-03-01T10:00:00Z',
    pages: 16,
    clientId: 'c14',
    propertyIds: ['p9'],
    matchIds: ['m14'],
    grade: 'B+',
    score: 0.67,
    description: 'Bloomberg-grade investment dossier for Marcus Williams (NYC institutional trader). He explicitly requested "the same level of data I get on Bloomberg." Includes 5-year transaction heat maps, rental yield curves, macro overlay (USD/AED, DIFC occupancy), and Manhattan return comparison.',
    whyThisMatch: 'Only DIFC-adjacent unit under AED 30M combining walk-to-work convenience with institutional-grade rental fundamentals. He works in DIFC and has "walk-to-work" as top-3 criterion. Scored 22% higher than next-best on his weighted criteria.',
    clientInsight: 'Analytical archetype shaped by Wall Street culture. Detail Orientation ~92/100. Evaluates property like trades: comprehensive data, risk metrics, peer comparisons. Available 4-7pm Dubai time only. In his one call, he spent 80% asking questions. Let him drive the conversation.',
    financialCase: 'AED 28M at 46.6% of AED 60M budget. DIFC yield 6.2% gross vs Manhattan 2.8-3.5% = compelling spread. Service charges AED 38/sqft (9.5% below DIFC avg). 24-month appreciation: +9.8% on DIFC commercial expansion.',
    brokerAction: 'Prepare institutional-grade PDF dossier for his late March Dubai trip. Include: DIFC 5-year transaction heat map, monthly rental yield curves, service charge benchmarking, macro overlay, Manhattan comparison. Send 10 days before arrival. During viewing: answer questions, do NOT pitch.',
    keyMetrics: [
      { label: 'Gross Yield', value: '6.2%', color: '#22c55e' },
      { label: 'vs Manhattan', value: '+280bps', color: '#22c55e' },
      { label: 'Service Charges', value: '-9.5% vs avg', color: '#3b82f6' },
      { label: 'Asking Price', value: 'AED 28M' },
      { label: 'Dubai Trip', value: 'Late March', color: '#f59e0b' },
      { label: 'Decision Stage', value: 'Discovery' },
    ],
  },
  {
    id: 'rpt11',
    title: 'Palm Signature Villa — Al Rashid Discovery Brief',
    type: 'opportunity',
    status: 'ready',
    generatedAt: '2026-02-25T09:00:00Z',
    pages: 8,
    clientId: 'c8',
    propertyIds: ['p6'],
    matchIds: ['m10'],
    grade: 'B+',
    score: 0.72,
    description: 'Discovery-stage opportunity brief for Omar Al Rashid. He presents as a pure investor, but browsing telemetry reveals growing conviction toward Palm lifestyle properties. Engine identifies "aspirational concealment" — he justifies lifestyle purchases through investment language.',
    whyThisMatch: '3 Palm-specific browsing sessions this week (8-12 min each, vs 3-min casual average). His investment framing may mask an emerging lifestyle interest. Tip-location at AED 135M sits at the intersection of investment quality and lifestyle aspiration.',
    clientInsight: 'Balanced profile whose behavior diverges from stated preferences. Responds to visual content 3x faster than text. Best reached via WhatsApp during 8-10pm UAE. 4 children aged 6-14 suggest family lifestyle is a latent priority he hasn\'t verbalized.',
    financialCase: 'AED 135M exceeds stated AED 30-70M range. But actual capacity: AED 280M assets, making this 48% allocation. Riyadh property (AED 95M listed) could fund acquisition. Palm tip villas: +28% appreciation in 2025, highest Dubai micromarket.',
    brokerAction: 'Present via WhatsApp with cinematic video walkthrough during evening hours. Lead with investment thesis (appreciation, scarcity, yield), let lifestyle sell through the visuals. Suggest "no-commitment private tour at his convenience." Do not pressure for immediate viewing.',
    keyMetrics: [
      { label: 'Browse Sessions', value: '3 this week', color: '#22c55e' },
      { label: 'Session Duration', value: '8-12 min', color: '#d4a574' },
      { label: 'Tip Appreciation', value: '+28%', color: '#22c55e' },
      { label: 'Asking Price', value: 'AED 135M' },
      { label: 'Stated Budget', value: 'AED 30-70M', color: '#f59e0b' },
      { label: 'True Capacity', value: 'AED 280M', color: '#3b82f6' },
    ],
  },
  {
    id: 'rpt12',
    title: 'Nakamura Success — Engine Proof of Concept',
    type: 'opportunity',
    status: 'ready',
    generatedAt: '2026-02-15T10:00:00Z',
    pages: 12,
    clientId: 'c16',
    propertyIds: ['p6'],
    matchIds: ['m13'],
    grade: 'A+',
    score: 0.94,
    description: 'CLOSED DEAL — Post-mortem and proof of concept. Palm Jumeirah Signature Villa closed at AED 135M. Engine predicted the purchase window 12 days pre-offer, price within 2%, and behavioral responses with 87% accuracy. This report serves as the template for future presentations and social proof material.',
    whyThisMatch: 'Highest-scoring match in portfolio history (94%). Decisive trophy buyer perfectly aligned with tip-location scarcity. Engine correctly predicted every behavioral response: exclusivity framing accelerated engagement exactly as modeled.',
    clientInsight: 'Validated learnings: (1) decisive archetypes respond to exclusivity framing — confirmed, (2) tip-location premium accepted by trophy buyers — confirmed, (3) family context accelerates UHNW timelines — confirmed. Nakamura already inquiring about a second property for his daughter.',
    financialCase: 'Closed AED 135M vs Engine projection AED 132-138M (within 2%). Post-acquisition: already +3.2% appreciation based on Feb 2026 comparable at AED 139M. Non-tip Palm villas: AED 108-115M, confirming AED 20-27M tip premium.',
    brokerAction: 'Use as social proof with Dubois (Monaco network connection). Begin qualification of Nakamura\'s daughter for separate match pipeline. Engine accuracy on this transaction: 96.2% — reference in all future client presentations.',
    keyMetrics: [
      { label: 'Match Score', value: '94%', color: '#22c55e' },
      { label: 'Close Price', value: 'AED 135M' },
      { label: 'Engine Accuracy', value: '96.2%', color: '#22c55e' },
      { label: 'Days to Close', value: '13' },
      { label: 'Post-Close Gain', value: '+3.2%', color: '#22c55e' },
      { label: 'Status', value: 'CLOSED', color: '#22c55e' },
    ],
  },
  {
    id: 'rpt13',
    title: 'Creek Harbour — Lee Investment Analysis',
    type: 'investment',
    status: 'generating',
    generatedAt: '2026-03-09T08:00:00Z',
    pages: 0,
    clientId: 'c20',
    propertyIds: ['p7'],
    matchIds: ['m15'],
    grade: 'B+',
    score: 0.69,
    description: 'Korean-language investment analysis for Jiwon Lee. 60-minute viewing (33% above average), photographed build quality details, asked about HOA structure. Preparing comparison with Seoul apartment returns.',
    whyThisMatch: 'New-build by Emaar (highest Korean buyer trust), waterfront, 4.8% gross yield vs Seoul 2.1%.',
    clientInsight: 'Analytical quality-oriented buyer. Prefers email communication, Korean-language documentation, 3-4 property comparisons before committing.',
    financialCase: 'AED 18M at 51.4% of AED 35M budget. +270bps yield premium over Seoul portfolio.',
    brokerAction: 'Prepare alternative viewings for comparison data. Provide Korean-language summaries. Email 48 hours before any meeting.',
    keyMetrics: [
      { label: 'Status', value: 'Generating...', color: '#f59e0b' },
      { label: 'Yield vs Seoul', value: '+270bps', color: '#22c55e' },
      { label: 'Viewing Duration', value: '60 min', color: '#d4a574' },
      { label: 'Asking Price', value: 'AED 18M' },
      { label: 'Decision Timeline', value: '3-5 weeks' },
      { label: 'Language', value: 'Korean req.' },
    ],
  },
  {
    id: 'rpt14',
    title: 'Downtown #4 — Yamamoto Portfolio Anchor Proposal',
    type: 'opportunity',
    status: 'scheduled',
    generatedAt: '2026-03-20T09:00:00Z',
    pages: 0,
    clientId: 'c5',
    propertyIds: ['p4'],
    matchIds: ['m9'],
    grade: 'B+',
    score: 0.71,
    description: 'Scheduled for generation after Yamamoto\'s commercial property exploration concludes (~4-6 weeks). This residential anchor proposal will position Downtown Residences #4 as "the property that completes your Dubai portfolio."',
    whyThisMatch: 'Japanese UHNW investors: 85% add premium residential within 3 months of commercial acquisition.',
    clientInsight: 'Currently in commercial evaluation. Do not override his Tokyo advisor\'s sequencing (commercial first, residential second).',
    financialCase: 'AED 45M at 37.5% of AED 120M budget. Dubai residential offers 4-5% yield vs Tokyo 2.8%.',
    brokerAction: 'Hold until commercial exploration concludes. Maintain light-touch engagement with market reports and event invitations.',
    keyMetrics: [
      { label: 'Status', value: 'Scheduled', color: '#3b82f6' },
      { label: 'Trigger', value: 'Commercial close' },
      { label: 'Est. Ready', value: '~4-6 weeks' },
      { label: 'Asking Price', value: 'AED 45M' },
      { label: 'Pattern', value: '85% add residential', color: '#a78bfa' },
      { label: 'Yield vs Tokyo', value: '+170bps', color: '#22c55e' },
    ],
  },
]

// ============================================================
// HELPERS
// ============================================================
function formatDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return `${diff}d ago`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ============================================================
// REPORT CARD — Match-Focused
// ============================================================
function ReportCard({ report, expanded, onToggle }: { report: MatchReport; expanded: boolean; onToggle: () => void }) {
  const tc = reportTypeConfig[report.type]
  const client = getClient(report.clientId)
  const primaryProperty = report.propertyIds.length > 0 ? getProperty(report.propertyIds[0]) : null
  const secondaryProperty = report.propertyIds.length > 1 ? getProperty(report.propertyIds[1]) : null

  const gradeColors: Record<string, { text: string; bg: string }> = {
    'A+': { text: '#22c55e', bg: '#22c55e15' },
    'A':  { text: '#3b82f6', bg: '#3b82f615' },
    'B+': { text: '#f59e0b', bg: '#f59e0b15' },
    'B':  { text: '#d4a574', bg: '#d4a57415' },
  }
  const gc = gradeColors[report.grade] || gradeColors['B']

  return (
    <div
      className="rounded-xl border transition-all duration-300 cursor-pointer group overflow-hidden"
      style={{
        borderColor: expanded ? `${tc.color}50` : 'rgba(255,255,255,0.06)',
        borderLeft: `3px solid ${tc.color}`,
        background: expanded ? `${tc.color}06` : 'rgba(255,255,255,0.015)',
      }}
      onClick={onToggle}
    >
      {/* Header Row */}
      <div className="px-5 py-4 flex items-center gap-4 group-hover:bg-white/[0.02] transition-colors">
        {/* Grade badge */}
        <div className="flex-shrink-0 w-[48px] h-[48px] rounded-xl flex flex-col items-center justify-center border-2"
          style={{ background: gc.bg, borderColor: `${gc.text}40` }}>
          <span className="text-[16px] font-black" style={{ color: gc.text }}>{report.grade}</span>
          <span className="text-[8px] font-mono opacity-70" style={{ color: gc.text }}>{Math.round(report.score * 100)}%</span>
        </div>

        {/* Title + client → property mapping */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-[14px] font-semibold text-pcis-text truncate">{report.title}</span>
            {report.status === 'generating' && (
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25 font-medium animate-pulse">Generating...</span>
            )}
            {report.status === 'scheduled' && (
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/25 font-medium">Scheduled</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[10px] px-2 py-0.5 rounded-md font-medium" style={{ color: tc.color, background: `${tc.color}12`, border: `1px solid ${tc.color}20` }}>{tc.label}</span>
            {/* Client → Property chain */}
            {client && (
              <span className="text-[11px] text-pcis-text-secondary font-medium">{client.name}</span>
            )}
            {primaryProperty && (
              <>
                <svg width="12" height="12" viewBox="0 0 12 12" className="text-pcis-gold/60 flex-shrink-0"><path d="M4 6h4M6.5 4L8.5 6L6.5 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span className="text-[11px] text-pcis-text-muted">{primaryProperty.name}</span>
              </>
            )}
            {secondaryProperty && (
              <>
                <span className="text-[9px] text-pcis-text-muted/40">+</span>
                <span className="text-[11px] text-pcis-text-muted/70">{secondaryProperty.name}</span>
              </>
            )}
          </div>
        </div>

        {/* Date + pages */}
        <div className="flex-shrink-0 text-right hidden sm:block">
          <span className="text-[12px] text-pcis-text-muted">{formatDate(report.generatedAt)}</span>
          {report.pages > 0 && <div className="text-[10px] text-pcis-text-muted/60 mt-0.5">{report.pages} pages</div>}
        </div>

        {/* Action buttons */}
        {report.status === 'ready' && (
          <div className="flex-shrink-0 flex gap-2" onClick={e => e.stopPropagation()}>
            <button className="text-[10px] px-3 py-1.5 rounded-lg border border-pcis-gold/30 text-pcis-gold bg-pcis-gold/[0.06] hover:bg-pcis-gold/[0.15] transition-all font-semibold uppercase tracking-wider">
              Present
            </button>
            <button className="text-[10px] px-3 py-1.5 rounded-lg border border-white/10 text-pcis-text-muted bg-white/[0.02] hover:bg-white/[0.06] transition-all font-semibold uppercase tracking-wider">
              PDF
            </button>
          </div>
        )}

        {/* Chevron */}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={`flex-shrink-0 text-pcis-text-muted/60 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}>
          <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {/* ============================================================ */}
      {/* EXPANDED — Broker Intelligence */}
      {/* ============================================================ */}
      {expanded && (
        <div className="border-t border-white/[0.06]" onClick={e => e.stopPropagation()}>
          {/* Description */}
          <div className="px-5 pt-4 pb-3">
            <p className="text-[12px] text-pcis-text-secondary leading-[1.7]">{report.description}</p>
          </div>

          {/* Key Metrics Strip */}
          <div className="px-5 pb-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
              {report.keyMetrics.map((m, i) => (
                <div key={i} className="bg-white/[0.03] rounded-lg px-3 py-2.5 border border-white/[0.05]">
                  <span className="text-[8px] text-pcis-text-muted uppercase tracking-wider block mb-0.5">{m.label}</span>
                  <span className="text-[14px] font-bold font-mono" style={{ color: m.color || '#e5e5e5' }}>{m.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 4-Section Intelligence Grid */}
          <div className="px-5 pb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { label: 'WHY THIS MATCH', text: report.whyThisMatch, color: '#3b82f6' },
              { label: 'CLIENT INSIGHT', text: report.clientInsight, color: '#a78bfa' },
              { label: 'FINANCIAL CASE', text: report.financialCase, color: '#22c55e' },
              { label: 'BROKER ACTION', text: report.brokerAction, color: '#d4a574' },
            ].map((section, i) => (
              <div key={i} className="bg-white/[0.02] rounded-lg p-4 border border-white/[0.05]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-[3px] h-[12px] rounded-full" style={{ background: section.color }} />
                  <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: section.color }}>{section.label}</span>
                </div>
                <p className="text-[11px] text-pcis-text-secondary leading-[1.7]">{section.text}</p>
              </div>
            ))}
          </div>

          {/* Actions bar */}
          {report.status === 'ready' && (
            <div className="px-5 pb-5 flex gap-2 flex-wrap">
              <button className="text-[11px] px-4 py-2 rounded-lg border border-pcis-gold/30 text-pcis-gold bg-pcis-gold/[0.06] hover:bg-pcis-gold/[0.15] transition-all font-semibold uppercase tracking-wider">
                Present to Client
              </button>
              <button className="text-[11px] px-4 py-2 rounded-lg border border-white/10 text-pcis-text-muted bg-white/[0.02] hover:bg-white/[0.06] transition-all font-semibold uppercase tracking-wider">
                Download PDF
              </button>
              <button className="text-[11px] px-4 py-2 rounded-lg border border-white/10 text-pcis-text-muted bg-white/[0.02] hover:bg-white/[0.06] transition-all font-semibold uppercase tracking-wider">
                Share via Email
              </button>
              <button className="text-[11px] px-4 py-2 rounded-lg border border-white/10 text-pcis-text-muted bg-white/[0.02] hover:bg-white/[0.06] transition-all font-semibold uppercase tracking-wider">
                Regenerate
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================
// MAIN PAGE
// ============================================================
export default function ReportsPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<ReportType | 'all'>('all')
  const [showTemplates, setShowTemplates] = useState(false)

  const filtered = useMemo(() => {
    if (typeFilter === 'all') return matchReports
    return matchReports.filter(r => r.type === typeFilter)
  }, [typeFilter])

  // Stats — match-driven
  const readyReports = matchReports.filter(r => r.status === 'ready').length
  const uniqueClients = new Set(matchReports.map(r => r.clientId)).size
  const uniqueProperties = new Set(matchReports.flatMap(r => r.propertyIds)).size
  const totalPipelineValue = matchReports.filter(r => r.status === 'ready').reduce((sum, r) => {
    return sum + r.propertyIds.reduce((s, pid) => {
      const p = getProperty(pid)
      return s + (p?.price ?? 0)
    }, 0)
  }, 0)
  const avgScore = matchReports.filter(r => r.status === 'ready').reduce((s, r) => s + r.score, 0) / readyReports

  const typeCounts = matchReports.reduce((acc, r) => {
    acc[r.type] = (acc[r.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Report generation templates — all match-driven
  const templates = [
    { id: 't1', name: 'Opportunity Brief', type: 'opportunity' as ReportType, description: 'Present a single matched property to a client with full intelligence on why this opportunity fits them', estimatedPages: '8-14', trigger: 'Per match' },
    { id: 't2', name: 'Investment Case', type: 'investment' as ReportType, description: 'Bloomberg-grade ROI analysis for analytical clients: yields, comparables, appreciation models, and portfolio comparison', estimatedPages: '12-18', trigger: 'Per analytical client' },
    { id: 't3', name: 'Portfolio Proposal', type: 'portfolio' as ReportType, description: 'Multi-property strategy for a client with 2+ active matches, including sequencing and negotiation leverage', estimatedPages: '14-20', trigger: 'Per multi-match client' },
    { id: 't4', name: 'Negotiation Playbook', type: 'negotiation' as ReportType, description: 'Active deal strategy: offer/counter modeling, concession strategy, furniture bridge, network effects', estimatedPages: '8-12', trigger: 'Per active negotiation' },
    { id: 't5', name: 'Comparative Analysis', type: 'comparative' as ReportType, description: 'Side-by-side property comparison for clients choosing between matches or pivoting from an original match', estimatedPages: '8-12', trigger: 'Per pivot / comparison' },
    { id: 't6', name: 'Re-Engagement Brief', type: 'reengagement' as ReportType, description: 'Recovery strategy for cooling clients: silence analysis, approach tactics, alternative positioning', estimatedPages: '4-8', trigger: 'Per at-risk client' },
  ]

  return (
    <div className="space-y-4">
      {/* ============================================================ */}
      {/* HEADER + STATS */}
      {/* ============================================================ */}
      <div className="bg-pcis-card/80 backdrop-blur-sm border border-pcis-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-[22px] font-bold text-pcis-text" style={{ fontFamily: "'Playfair Display', serif" }}>Match Reports</h1>
            <p className="text-[12px] text-pcis-text-muted mt-1">Client-ready intelligence briefs — every report links a market opportunity to a client</p>
          </div>
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="text-[11px] px-5 py-2.5 rounded-lg border border-pcis-gold/40 text-pcis-gold bg-pcis-gold/[0.08] hover:bg-pcis-gold/[0.18] transition-all font-semibold uppercase tracking-wider hover:border-pcis-gold/60"
          >
            {showTemplates ? 'View Reports' : 'Generate Report'}
          </button>
        </div>

        {/* Stats strip — match-driven */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.05]">
            <span className="text-[9px] text-pcis-text-muted uppercase tracking-wider block mb-1">Reports Ready</span>
            <span className="text-[24px] font-bold text-pcis-text font-mono">{readyReports}</span>
            <span className="text-[10px] text-pcis-text-muted ml-1">to present</span>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.05]">
            <span className="text-[9px] text-pcis-text-muted uppercase tracking-wider block mb-1">Clients Briefed</span>
            <span className="text-[24px] font-bold text-pcis-text font-mono">{uniqueClients}</span>
            <span className="text-[10px] text-pcis-text-muted ml-1">unique clients</span>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.05]">
            <span className="text-[9px] text-pcis-text-muted uppercase tracking-wider block mb-1">Properties Matched</span>
            <span className="text-[24px] font-bold text-pcis-text font-mono">{uniqueProperties}</span>
            <span className="text-[10px] text-pcis-text-muted ml-1">opportunities</span>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.05]">
            <span className="text-[9px] text-pcis-text-muted uppercase tracking-wider block mb-1">Avg Match Score</span>
            <span className="text-[24px] font-bold text-green-400 font-mono">{Math.round(avgScore * 100)}%</span>
            <span className="text-[10px] text-pcis-text-muted ml-1">across reports</span>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.05]">
            <span className="text-[9px] text-pcis-text-muted uppercase tracking-wider block mb-1">Pipeline Value</span>
            <span className="text-[16px] font-bold text-pcis-gold font-mono" style={{ fontFamily: "'Playfair Display', serif" }}>
              AED {(totalPipelineValue / 1_000_000_000).toFixed(1)}B
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* REPORT TEMPLATES (toggle) */}
      {/* ============================================================ */}
      {showTemplates && (
        <div className="bg-pcis-card/80 backdrop-blur-sm border border-pcis-border rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-[4px] h-[18px] rounded-full bg-pcis-gold" />
            <h2 className="text-[14px] font-semibold text-pcis-text">Generate from Match</h2>
            <div className="flex-1 h-px bg-pcis-gold/10" />
            <span className="text-[10px] text-pcis-text-muted">Select a report type, then choose the client + property match</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {templates.map(t => {
              const tc = reportTypeConfig[t.type]
              return (
                <div key={t.id} className="bg-white/[0.02] rounded-lg p-4 border border-white/[0.06] hover:border-pcis-gold/20 transition-all cursor-pointer group">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-[32px] h-[32px] rounded-lg flex items-center justify-center"
                      style={{ background: `${tc.color}15`, border: `1px solid ${tc.color}25` }}>
                      <span className="text-[14px]" style={{ color: tc.color }}>{tc.icon}</span>
                    </div>
                    <span className="text-[12px] font-semibold text-pcis-text">{t.name}</span>
                  </div>
                  <p className="text-[11px] text-pcis-text-muted leading-relaxed mb-3">{t.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] text-pcis-text-muted/60">{t.estimatedPages} pages</span>
                      <span className="text-[9px] text-pcis-text-muted/60">{t.trigger}</span>
                    </div>
                    <button className="text-[9px] px-3 py-1 rounded-md border border-pcis-gold/20 text-pcis-gold bg-pcis-gold/[0.04] opacity-0 group-hover:opacity-100 transition-opacity font-semibold uppercase tracking-wider">
                      Select Match →
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* FILTER BAR */}
      {/* ============================================================ */}
      {!showTemplates && (
        <>
          <div className="bg-pcis-card/80 backdrop-blur-sm border border-pcis-border rounded-xl px-5 py-3.5">
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => setTypeFilter('all')}
                className={`text-[11px] px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  typeFilter === 'all' ? 'bg-white/[0.08] text-pcis-text border border-white/20' : 'text-white/30 border border-transparent hover:text-white/50'
                }`}
              >All Reports</button>
              {(Object.keys(reportTypeConfig) as ReportType[]).map(type => {
                const tc = reportTypeConfig[type]
                const count = typeCounts[type] || 0
                if (count === 0) return null
                const active = typeFilter === type
                return (
                  <button key={type} onClick={() => setTypeFilter(type)}
                    className="text-[11px] px-3 py-1.5 rounded-lg font-semibold border transition-all flex items-center gap-1.5"
                    style={{
                      background: active ? `${tc.color}15` : 'transparent',
                      color: active ? tc.color : 'rgba(255,255,255,0.25)',
                      borderColor: active ? `${tc.color}30` : 'rgba(255,255,255,0.06)',
                    }}
                  >
                    {tc.label}
                    <span className="text-[9px] font-mono opacity-60">{count}</span>
                  </button>
                )
              })}
              <div className="ml-auto text-[11px] text-pcis-text-muted font-mono">{filtered.length} reports</div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* REPORT LIST */}
          {/* ============================================================ */}
          <div className="space-y-3">
            {filtered.map(r => (
              <ReportCard
                key={r.id}
                report={r}
                expanded={expandedId === r.id}
                onToggle={() => setExpandedId(expandedId === r.id ? null : r.id)}
              />
            ))}
            {filtered.length === 0 && (
              <div className="bg-white/[0.02] rounded-xl border border-white/[0.06] p-12 text-center">
                <p className="text-[13px] text-pcis-text-muted">No reports found for this category</p>
              </div>
            )}
          </div>

          {/* ============================================================ */}
          {/* AUTO-GENERATION QUEUE */}
          {/* ============================================================ */}
          <div className="bg-pcis-card/80 backdrop-blur-sm border border-pcis-border rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-[4px] h-[18px] rounded-full bg-purple-400" />
              <h2 className="text-[14px] font-semibold text-pcis-text">Auto-Generation Triggers</h2>
              <div className="flex-1 h-px bg-purple-400/10" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { name: 'New Match (Score ≥ 75%)', description: 'Auto-generates Opportunity Brief when Engine 2 creates a match scoring 75%+ on any pillar combination', trigger: 'On match creation', type: 'opportunity' as ReportType, status: 'Active' },
                { name: 'Negotiation Entered', description: 'Auto-generates Negotiation Playbook when a match progresses to Offer Prep or Negotiation stage', trigger: 'On stage change', type: 'negotiation' as ReportType, status: 'Active' },
                { name: 'Client Cooling (14d+)', description: 'Auto-generates Re-Engagement Brief when client engagement drops below baseline for 14+ consecutive days', trigger: 'On engagement decay', type: 'reengagement' as ReportType, status: 'Active' },
              ].map((s, i) => {
                const tc = reportTypeConfig[s.type]
                return (
                  <div key={i} className="bg-white/[0.02] rounded-lg p-4 border border-white/[0.06]">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-[8px] h-[8px] rounded-full bg-green-400 animate-pulse" />
                      <span className="text-[12px] font-semibold text-pcis-text">{s.name}</span>
                    </div>
                    <p className="text-[10px] text-pcis-text-muted leading-relaxed mb-3">{s.description}</p>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-pcis-text-muted">Trigger</span>
                        <span className="text-[10px] text-pcis-text-secondary">{s.trigger}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-pcis-text-muted">Generates</span>
                        <span className="text-[10px] font-medium" style={{ color: tc.color }}>{tc.label}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
