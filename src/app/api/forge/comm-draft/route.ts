import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { callClaude } from '@/lib/aiEngine'

// ============================================================================
// FORGE AI -- Communication Draft (Archetype-Tuned Outreach)
// ============================================================================
// Generates broker communications tuned to the client's CIE archetype
// and communication preferences. Supports email, WhatsApp, call scripts.
// ============================================================================

const SYSTEM_PROMPT = `You are FORGE -- the strategic action layer within PCIS Solutions' intelligence platform. You craft high-stakes client communications for senior property advisors operating in Dubai's UHNW market.

You are generating a communication draft tuned precisely to the client's CIE cognitive profile. Every word choice, sentence length, and structural decision must reflect how this specific client processes information and builds trust.

Your output must have these 4 sections. Label each section with its heading on a separate line:

COMMUNICATION BRIEF
In one paragraph, explain the strategic rationale behind this communication. Why now? What is the objective? How does the timing align with the client's engagement momentum and deal stage? What response are we optimising for? Reference specific CIE data points that informed the tone and approach choices.

PRIMARY DRAFT
The actual communication text, ready to send. This must be:
- Calibrated to the specified channel (email = structured with subject line; WhatsApp = concise and personal; call script = conversational with talking points)
- Tuned to the client's archetype (decisive = direct and brief; analytical = data-rich; cautious = reassuring with social proof; balanced = warm but professional)
- Adjusted to the specified tone (formal/consultative/casual/urgent)
- Specific to the context -- reference actual properties, scores, or market data provided
- Written in British English, professional but not stiff

For email: Include a subject line (prefixed with "Subject:") followed by the body.
For WhatsApp: Keep under 200 words, conversational, no formal closings.
For call script: Structure as an opening, key points with transitions, and a closing ask.

COGNITIVE CALIBRATION NOTES
Explain specifically how you calibrated the draft to the CIE profile. Which cognitive dimensions most influenced the tone? Why did you choose this sentence length and complexity? How does the structure map to their Information Processing and Trust Formation scores? This section helps the advisor understand the psychology behind the draft so they can adapt on the fly.

FOLLOW-UP GUIDANCE
Based on the client's Decision Velocity and engagement patterns, what follow-up timing is optimal? What should the next touch look like if the client responds positively vs if they go silent? Provide specific timeframes and approach adjustments.

Write as a world-class communications strategist who understands that in UHNW real estate, every word carries weight. The draft should feel like it was written by the advisor themselves -- not by AI.`

export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const cogStr = (body.cognitiveScores || [])
      .map((s: any) => `${s.dimension}: ${s.value}/100`)
      .join(', ')

    const userMessage = `Generate a ${body.channel || 'email'} communication draft:

═══ CLIENT ═══
Name: ${body.clientName}
Type: ${body.clientType} | Category: ${body.clientCategory}
Archetype: ${body.archetypeLabel} (${body.archetype})
Cognitive Profile: ${cogStr}
Communication Tips: ${(body.communicationTips || []).join('; ')}
Engagement: ${body.engagementScore ?? 'N/A'}/100 | Momentum: ${body.engagementMomentum || 'N/A'}
Deal Stage: ${body.dealStage}
Days Since Last Contact: ${body.daysSinceContact ?? 'Unknown'}

═══ COMMUNICATION PARAMETERS ═══
Channel: ${body.channel || 'email'}
Tone: ${body.tone || 'consultative'}
Purpose: ${body.commPurpose || 'General follow-up'}
Context: ${body.context || 'Routine engagement'}

═══ PROPERTIES TO REFERENCE ═══
${(body.properties || []).map((p: any) => `- ${p.name} (${p.area}): AED ${((p.price || 0) / 1e6).toFixed(1)}M | Score: ${p.matchScore || 'N/A'}/100`).join('\n') || 'No specific properties'}

═══ MARKET CONTEXT ═══
${body.marketContext || 'General market conditions in Dubai remain favourable.'}

═══ ADVISOR NOTES ═══
${body.advisorNotes || 'None provided'}

Generate the 4-section communication package.`

    const result = await callClaude({
      systemPrompt: SYSTEM_PROMPT,
      userMessage,
      maxTokens: 1500,
      temperature: 0.7,
    })

    return NextResponse.json({
      draft: result.content,
      model: result.model,
      tokens: result.tokens,
    })
  } catch (err: any) {
    console.error('FORGE comm-draft error:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to generate communication draft' },
      { status: 500 }
    )
  }
}
