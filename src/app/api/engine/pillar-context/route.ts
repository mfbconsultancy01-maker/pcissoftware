import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { callAI } from '@/lib/aiEngine'

// ============================================================================
// ENGINE AI -- Pillar Context Analysis
// ============================================================================
// Given a specific pillar score within a match, generates a deep explanation
// of what drove that score, what data points contributed, and what the
// edge cases are. Replaces template-based generatePillarContext().
// ============================================================================

const SYSTEM_PROMPT = `You are the Pillar Scoring Analyst within PCIS Solutions' ENGINE (E3) module -- a luxury real estate intelligence platform operating in Dubai.

You are explaining ONE specific scoring pillar for a client-property match. ENGINE evaluates every match across 4 pillars: Financial Fit, Lifestyle Fit, Investment Fit, and Purpose Alignment.

Write a 2-3 paragraph analysis for the specific pillar provided. Your analysis must:

1. FIRST PARAGRAPH: Explain exactly what drove this score. Not "the score is high because things align" -- cite the specific data points. If Financial Fit is 82, explain which numbers made it 82 (budget vs price, projected returns, cost ratios). If Lifestyle Fit is 57, explain exactly which lifestyle factors fell short (community type, amenity gap, location distance from preference).

2. SECOND PARAGRAPH: Connect the pillar to the client's purpose classification. A Financial Fit of 75 means something different for an Investment buyer than for an End-Use buyer. Explain how the pillar weight affects the composite score for this specific purpose type, and whether this pillar is pulling the overall match up or down.

3. THIRD PARAGRAPH (if score < 70): Explain what would need to change to improve this pillar score. Is it a market-side issue (price needs to drop) or a client-side issue (budget needs to expand)? Is the gap fixable or structural?

Be precise with numbers. Reference the actual data provided. Do not pad with generic observations.`

interface PillarContextRequest {
  pillarName: string
  pillarShortCode: string
  score: number
  weight: number
  breakdown: string
  // Match context
  clientName: string
  propertyName: string
  propertyArea: string
  propertyType: string
  propertyPrice: number
  purpose: string
  overallScore: number
  grade: string
  // Client context
  budgetMin: number
  budgetMax: number
  clientType: string
  archetype: string
  archetypeLabel: string
  // Area data (if available)
  areaAvgPriceSqft: number | null
  areaRentalYield: number | null
  areaDemandScore: number | null
  areaPriceChange30d: number | null
  areaTransactionCount: number | null
  areaOutlook: string | null
  // Other pillar scores for context
  allPillarScores: { name: string; score: number; weight: number }[]
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: PillarContextRequest = await request.json()

    const otherPillars = body.allPillarScores
      .filter(p => p.name !== body.pillarName)
      .map(p => `${p.name}: ${p.score}/100 (${Math.round(p.weight * 100)}% weight)`)
      .join(', ')

    const areaContext = body.areaAvgPriceSqft
      ? `\nAREA MARKET DATA (from SCOUT):
- Average Price/Sqft: AED ${body.areaAvgPriceSqft.toLocaleString()}
- Rental Yield: ${body.areaRentalYield ? (body.areaRentalYield * 100).toFixed(1) + '%' : 'N/A'}
- Demand Score: ${body.areaDemandScore ?? 'N/A'}/100
- 30-Day Price Change: ${body.areaPriceChange30d != null ? (body.areaPriceChange30d >= 0 ? '+' : '') + body.areaPriceChange30d.toFixed(1) + '%' : 'N/A'}
- Transaction Count (Recent): ${body.areaTransactionCount ?? 'N/A'}
- Market Outlook: ${body.areaOutlook || 'N/A'}`
      : ''

    const userMessage = `Analyse this pillar score in depth:

PILLAR BEING ANALYSED:
- Pillar: ${body.pillarName} (${body.pillarShortCode})
- Score: ${body.score}/100
- Weight for this purpose type: ${Math.round(body.weight * 100)}%
- Scoring Breakdown: ${body.breakdown || 'No breakdown available'}

MATCH CONTEXT:
- Client: ${body.clientName} (${body.clientType}, ${body.archetypeLabel} archetype)
- Property: ${body.propertyName} (${body.propertyArea}, ${body.propertyType})
- Property Price: AED ${(body.propertyPrice / 1e6).toFixed(1)}M
- Client Budget: AED ${(body.budgetMin / 1e6).toFixed(0)}M -- ${(body.budgetMax / 1e6).toFixed(0)}M
- Purpose: ${body.purpose}
- Overall Match Score: ${body.overallScore}/100 (Grade ${body.grade})
- Other Pillar Scores: ${otherPillars}
${areaContext}

Generate the pillar analysis.`

    const result = await callAI({
      systemPrompt: SYSTEM_PROMPT,
      userMessage,
      maxTokens: 700,
      temperature: 0.65,
    })

    return NextResponse.json({
      analysis: result.content,
      model: result.model,
      tokens: result.tokens,
    })
  } catch (err: any) {
    console.error('Pillar context error:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to generate pillar analysis' },
      { status: 500 }
    )
  }
}
