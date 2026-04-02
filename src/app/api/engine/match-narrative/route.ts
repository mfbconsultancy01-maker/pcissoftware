import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { callAI } from '@/lib/aiEngine'

// ============================================================================
// ENGINE AI -- Match Narrative (Full Intelligence Brief)
// ============================================================================
// The crown jewel of ENGINE's AI layer. Takes the complete data payload
// from CIE, ENGINE, and SCOUT and synthesizes a genuine analytical
// assessment. This replaces ALL template narratives in the Match Scorer
// and Client-Property Grid detail panels.
// ============================================================================

const SYSTEM_PROMPT = `You are the Match Intelligence Engine within PCIS Solutions' ENGINE (E3) module -- a luxury real estate intelligence platform operating in Dubai's ultra-high-net-worth property market.

You are generating a comprehensive match intelligence brief for a specific client-property pairing. You have access to the full data payload from three PCIS engines: CIE (client psychology), ENGINE (scoring), and SCOUT (market data).

Your brief must have these 5 sections, each as its own paragraph. Label each section with its heading on a separate line:

EXECUTIVE SUMMARY
Write a commanding opening that states the match score, grade, and the core thesis of this pairing. Explain what makes this match work (or not work) in one clear paragraph. Reference the client's archetype, purpose classification confidence, and the pillar spread. If the pillar variance is high, explain what that means for the match quality.

STRENGTH ANALYSIS
Identify the strongest pillar and explain in depth what specific data points drove that strength. Do not just say "financial fit is strong" -- explain WHY (e.g., "the property at AED 12.5M sits at 62% of the client's AED 20M ceiling, leaving significant negotiation room and signaling that this is a comfortable acquisition rather than a stretch purchase"). Connect the strength to the client's archetype and purpose.

RISK & FRICTION ASSESSMENT
Identify the weakest pillar and analyse the specific friction points. What is causing the weakness? Is it structural (the property fundamentally doesn't fit) or contextual (market timing, price adjustment needed, amenity development pending)? Provide specific guidance on how FORGE should address this weakness in any client presentation -- what framing would mitigate the concern?

MARKET POSITIONING
Using the SCOUT data, analyse how this property/area sits in the current market. Reference transaction volumes, price momentum, demand scores, and outlook. Explain what the market context means for the timing of this deal -- is there urgency, or can the client take a measured approach? How does the market trajectory affect the investment case?

STRATEGIC RECOMMENDATION
Based on all the above, give a clear recommendation. Should this match progress to FORGE for deal brief generation? Should it be presented as a primary recommendation or a comparative option? What specific aspects should the broker emphasise or de-emphasise? Reference the client's CIE archetype to tailor the recommendation -- how should this be COMMUNICATED to this specific client type?

Write with authority and specificity. Every paragraph must contain at least two specific data points from the payload. Do not use generic filler language.`

interface MatchNarrativeRequest {
  // Match data
  matchId: string
  overallScore: number
  grade: string
  purpose: string
  confidence: number
  status: string
  // Pillar scores
  financialFit: { score: number; weight: number; breakdown: string }
  lifestyleFit: { score: number; weight: number; breakdown: string }
  investmentFit: { score: number; weight: number; breakdown: string }
  purposeAlignment: { score: number; weight: number; breakdown: string }
  // Client data
  clientName: string
  clientType: string
  clientCategory: string
  budgetMin: number
  budgetMax: number
  location: string
  dealStage: string
  // CIE data
  archetype: string
  archetypeLabel: string
  cognitiveScores: { dimension: string; value: number }[]
  keyTraits: string[]
  approachStrategy: string
  communicationTips: string[]
  engagementScore: number | null
  engagementMomentum: string | null
  // Property/area data
  propertyName: string
  propertyArea: string
  propertyType: string
  propertyPrice: number
  propertyBedrooms: number
  propertyFeatures: string[]
  // SCOUT market data
  areaAvgPriceSqft: number | null
  areaRentalYield: number | null
  areaDemandScore: number | null
  areaPriceChange30d: number | null
  areaTransactionCount: number | null
  areaOutlook: string | null
  // Purpose config
  investmentWeight: number
  lifestyleWeight: number
  keyFactors: string[]
  // Existing data-layer narrative for context
  dataLayerNarrative: string
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: MatchNarrativeRequest = await request.json()

    const cogStr = body.cognitiveScores
      .map(s => `${s.dimension}: ${s.value}/100`)
      .join(', ')

    const userMessage = `Generate a full match intelligence brief for this pairing:

═══ MATCH SCORING ═══
Match ID: ${body.matchId}
Overall Score: ${body.overallScore}/100 | Grade: ${body.grade}
Purpose: ${body.purpose} | Confidence: ${Math.round(body.confidence * 100)}%
Status: ${body.status}

Pillar Scores:
- Financial Fit: ${body.financialFit.score}/100 (weight: ${Math.round(body.financialFit.weight * 100)}%) -- ${body.financialFit.breakdown}
- Lifestyle Fit: ${body.lifestyleFit.score}/100 (weight: ${Math.round(body.lifestyleFit.weight * 100)}%) -- ${body.lifestyleFit.breakdown}
- Investment Fit: ${body.investmentFit.score}/100 (weight: ${Math.round(body.investmentFit.weight * 100)}%) -- ${body.investmentFit.breakdown}
- Purpose Alignment: ${body.purposeAlignment.score}/100 (weight: ${Math.round(body.purposeAlignment.weight * 100)}%) -- ${body.purposeAlignment.breakdown}

Purpose Scoring Config:
- Investment Weight: ${Math.round(body.investmentWeight * 100)}% | Lifestyle Weight: ${Math.round(body.lifestyleWeight * 100)}%
- Key Factors: ${body.keyFactors.join(', ')}

═══ CLIENT PROFILE (from CIE) ═══
Name: ${body.clientName}
Type: ${body.clientType} | Category: ${body.clientCategory}
Budget: AED ${(body.budgetMin / 1e6).toFixed(1)}M -- ${(body.budgetMax / 1e6).toFixed(1)}M
Location: ${body.location} | Deal Stage: ${body.dealStage}
CIE Archetype: ${body.archetypeLabel} (${body.archetype})
Cognitive Profile: ${cogStr}
Key Traits: ${body.keyTraits.join(', ')}
Approach Strategy: ${body.approachStrategy}
Communication Tips: ${body.communicationTips.join('; ')}
Engagement: ${body.engagementScore ?? 'N/A'}/100 | Momentum: ${body.engagementMomentum || 'N/A'}

═══ PROPERTY / AREA ═══
Property: ${body.propertyName}
Area: ${body.propertyArea} | Type: ${body.propertyType} | Bedrooms: ${body.propertyBedrooms}
Price: AED ${(body.propertyPrice / 1e6).toFixed(1)}M
Features: ${body.propertyFeatures.join(', ') || 'N/A'}

═══ SCOUT MARKET INTELLIGENCE ═══
${body.areaAvgPriceSqft ? `Avg Price/Sqft: AED ${body.areaAvgPriceSqft.toLocaleString()}
Rental Yield: ${body.areaRentalYield ? (body.areaRentalYield * 100).toFixed(1) + '%' : 'N/A'}
Demand Score: ${body.areaDemandScore ?? 'N/A'}/100
30-Day Price Change: ${body.areaPriceChange30d != null ? (body.areaPriceChange30d >= 0 ? '+' : '') + body.areaPriceChange30d.toFixed(1) + '%' : 'N/A'}
Recent Transactions: ${body.areaTransactionCount ?? 'N/A'}
Market Outlook: ${body.areaOutlook || 'N/A'}` : 'No SCOUT data available for this area'}

═══ DATA-LAYER NARRATIVE (for reference) ═══
${body.dataLayerNarrative}

Generate the 5-section intelligence brief.`

    const result = await callAI({
      systemPrompt: SYSTEM_PROMPT,
      userMessage,
      maxTokens: 1500,
      temperature: 0.7,
    })

    return NextResponse.json({
      narrative: result.content,
      model: result.model,
      tokens: result.tokens,
    })
  } catch (err: any) {
    console.error('Match narrative error:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to generate match narrative' },
      { status: 500 }
    )
  }
}
