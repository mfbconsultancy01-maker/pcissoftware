import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { callAI } from '@/lib/aiEngine'

// ============================================================================
// ENGINE AI -- Purpose Classification Analysis
// ============================================================================
// Given a client's full profile (CIE data, financial profile, engagement
// history, signals), generates an intelligence-grade narrative explaining
// WHY the client was classified under a specific purpose category.
// This replaces the template-based generatePurposeNarrative() function.
// ============================================================================

const SYSTEM_PROMPT = `You are the Purpose Classification Engine within PCIS Solutions' ENGINE (E3) module -- a luxury real estate intelligence platform operating in Dubai's ultra-high-net-worth property market.

Your role is to analyse a client's full profile and explain why they were classified under a specific purchase purpose. You have access to their CIE (Client Intelligence Engine) psychological profile, financial parameters, engagement signals, and behavioural patterns.

Write a 3-4 paragraph intelligence narrative that:

1. FIRST PARAGRAPH: State the classification and explain the primary reasoning. What specific data points and behavioural signals led to this classification? Reference exact numbers (budget range, confidence score, signal count). Explain how the client's archetype influences the classification.

2. SECOND PARAGRAPH: Analyse the supporting signals in depth. Don't just list them -- explain what each signal reveals about the client's intent. Connect engagement patterns to the purpose category. If the client has a secondary purpose, explain the tension or complementarity between primary and secondary.

3. THIRD PARAGRAPH: Explain the scoring implications. How does this classification affect pillar weighting in ENGINE's match scoring? What types of properties will score highest for this client? What are the key factors ENGINE prioritises for this purpose type?

4. FOURTH PARAGRAPH (if relevant): Note any classification risks or edge cases. Is the confidence score high enough to be reliable? Are there signals that contradict the classification? What would cause a reclassification?

Be analytical and specific. This is an intelligence brief, not a marketing document.`

interface PurposeAnalysisRequest {
  clientName: string
  clientType: string
  clientCategory: string
  location: string
  budgetMin: number
  budgetMax: number
  dealStage: string
  primaryPurpose: string
  secondaryPurpose: string | null
  confidence: number
  signals: string[]
  archetype: string
  archetypeLabel: string
  cognitiveProfile: { dimension: string; value: number; trend: string }[]
  keyTraits: string[]
  approachStrategy: string
  engagementScore: number | null
  engagementMomentum: string | null
  matchCount: number
  topMatchScore: number
  investmentWeight: number
  lifestyleWeight: number
  keyFactors: string[]
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: PurposeAnalysisRequest = await request.json()

    const cogProfileStr = body.cognitiveProfile
      .map(d => `${d.dimension}: ${d.value}/100 (${d.trend})`)
      .join(', ')

    const userMessage = `Analyse the purpose classification for this client:

CLIENT PROFILE:
- Name: ${body.clientName}
- Type: ${body.clientType} | Category: ${body.clientCategory}
- Location: ${body.location}
- Budget Range: AED ${(body.budgetMin / 1e6).toFixed(0)}M -- ${(body.budgetMax / 1e6).toFixed(0)}M
- Deal Stage: ${body.dealStage}

CIE INTELLIGENCE:
- Archetype: ${body.archetypeLabel} (${body.archetype})
- Cognitive Profile: ${cogProfileStr}
- Key Traits: ${body.keyTraits.join(', ')}
- Approach Strategy: ${body.approachStrategy}
- Engagement Score: ${body.engagementScore ?? 'N/A'}/100
- Engagement Momentum: ${body.engagementMomentum || 'N/A'}

PURPOSE CLASSIFICATION:
- Primary Purpose: ${body.primaryPurpose}
- Secondary Purpose: ${body.secondaryPurpose || 'None'}
- Confidence: ${Math.round(body.confidence * 100)}%
- Supporting Signals: ${body.signals.join('; ')}

SCORING CONFIGURATION:
- Investment Weight: ${Math.round(body.investmentWeight * 100)}%
- Lifestyle Weight: ${Math.round(body.lifestyleWeight * 100)}%
- Key Scoring Factors: ${body.keyFactors.join(', ')}

ENGINE MATCH DATA:
- Active Matches: ${body.matchCount}
- Top Match Score: ${body.topMatchScore}/100

Generate the purpose classification analysis.`

    const result = await callAI({
      systemPrompt: SYSTEM_PROMPT,
      userMessage,
      maxTokens: 1000,
      temperature: 0.7,
    })

    return NextResponse.json({
      analysis: result.content,
      model: result.model,
      tokens: result.tokens,
    })
  } catch (err: any) {
    console.error('Purpose analysis error:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to generate analysis' },
      { status: 500 }
    )
  }
}
