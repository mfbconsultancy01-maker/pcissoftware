import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { callClaude } from '@/lib/aiEngine'

// ============================================================================
// FORGE AI -- Opportunity Scan (Cross-Engine Pattern Detection)
// ============================================================================
// Analyses all matches, market data, and client profiles to surface
// opportunities the broker hasn't spotted. Proactive intelligence.
// ============================================================================

const SYSTEM_PROMPT = `You are FORGE -- the strategic action layer within PCIS Solutions' intelligence platform. You are the Opportunity Radar -- your job is to find what human brokers miss.

You are scanning across all PCIS engine data for a specific client to surface hidden opportunities, overlooked matches, market timing windows, and strategic insights that are not immediately obvious from looking at individual match scores.

Your analysis must have these 5 sections, each as its own paragraph block. Label each section with its heading on a separate line:

HIDDEN GEMS
Identify matches or opportunities in the data that score well on specific pillars but may have been overlooked due to a lower overall score. A property with 90+ on Financial Fit but 55 on Lifestyle Fit might be a hidden gem for an investment-focused client. Look for asymmetric pillar distributions that actually align with the client's purpose even if the overall score doesn't reflect it. Be specific -- name the properties and explain exactly why they deserve a second look.

MARKET TIMING SIGNALS
Analyse the SCOUT data across all areas where this client has matches. Are any areas showing momentum shifts -- rising demand scores, increasing transaction volumes, price acceleration? Identify time-sensitive opportunities where acting now provides an advantage over waiting. Conversely, flag areas where the data suggests patience would be rewarded. Provide specific numbers and timeframe recommendations.

RE-ENGAGEMENT OPPORTUNITIES
Based on the client's engagement score, momentum, and deal stage, identify re-engagement strategies. If engagement is declining, what specific trigger could reignite interest? If there are matches the client previously rejected, has anything changed in the market data that warrants revisiting? Connect CIE archetype insights to the re-engagement approach -- different client types respond to different re-engagement triggers.

CROSS-MATCH PATTERNS
Look across all matches for this client and identify patterns. Are they consistently scoring high in one area? Is there a property type that over-performs? Are there purpose-alignment patterns that suggest a refinement to their classification? This meta-analysis can reveal that the client's stated preferences don't match their scoring patterns, which is valuable intelligence for the advisor.

STRATEGIC RECOMMENDATIONS
Synthesise all the above into 3-5 specific, actionable next steps. Each recommendation should be concrete: "Present Property X to the client with emphasis on Y data point, using Z communication approach based on their CIE archetype." Prioritise by impact and urgency. The advisor should be able to take these recommendations and act on them today.

Think like a chief strategist who has access to every data point in the system and can see connections that individual analyses miss. Every insight must be grounded in specific data from the payload.`

export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const matchSummaries = (body.matches || []).map((m: any) =>
      `  - ${m.propertyName || m.propertyId} (${m.area || 'N/A'}): Score ${m.overallScore}/100 [${m.grade}] | FIN:${m.financialFit} LIF:${m.lifestyleFit} INV:${m.investmentFit} PUR:${m.purposeAlignment} | Status: ${m.status}`
    ).join('\n')

    const areaSummaries = (body.areaData || []).map((a: any) =>
      `  - ${a.name}: Demand ${a.demandScore}/100 | Yield ${a.rentalYield ? (a.rentalYield * 100).toFixed(1) + '%' : 'N/A'} | 30d Change ${a.priceChange30d != null ? (a.priceChange30d >= 0 ? '+' : '') + a.priceChange30d.toFixed(1) + '%' : 'N/A'} | Outlook: ${a.outlook} | Txns: ${a.transactionCount}`
    ).join('\n')

    const userMessage = `Scan for hidden opportunities for this client:

═══ CLIENT PROFILE ═══
Name: ${body.clientName}
Type: ${body.clientType} | Category: ${body.clientCategory}
Budget: AED ${((body.budgetMin || 0) / 1e6).toFixed(1)}M -- AED ${((body.budgetMax || 0) / 1e6).toFixed(1)}M
Archetype: ${body.archetypeLabel} (${body.archetype})
Purpose: ${body.primaryPurpose} (Confidence: ${Math.round((body.purposeConfidence || 0) * 100)}%)
Engagement: ${body.engagementScore ?? 'N/A'}/100 | Momentum: ${body.engagementMomentum || 'N/A'}
Deal Stage: ${body.dealStage}
Days Since Last Contact: ${body.daysSinceContact ?? 'Unknown'}

═══ ALL ACTIVE MATCHES (${(body.matches || []).length} total) ═══
${matchSummaries || 'No matches available'}

═══ MARKET DATA ACROSS RELEVANT AREAS ═══
${areaSummaries || 'No area data available'}

═══ SCORING CONTEXT ═══
Investment Weight: ${Math.round((body.investmentWeight || 0) * 100)}% | Lifestyle Weight: ${Math.round((body.lifestyleWeight || 0) * 100)}%
Key Purpose Factors: ${(body.keyFactors || []).join(', ')}

Generate the 5-section Opportunity Scan.`

    const result = await callClaude({
      systemPrompt: SYSTEM_PROMPT,
      userMessage,
      maxTokens: 2000,
      temperature: 0.75,
    })

    return NextResponse.json({
      scan: result.content,
      model: result.model,
      tokens: result.tokens,
    })
  } catch (err: any) {
    console.error('FORGE opportunity-scan error:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to generate opportunity scan' },
      { status: 500 }
    )
  }
}
