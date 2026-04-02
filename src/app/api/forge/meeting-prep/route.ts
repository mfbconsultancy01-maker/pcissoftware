import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { callClaude } from '@/lib/aiEngine'

// ============================================================================
// FORGE AI -- Meeting Prep (CIE-Driven Tactical Briefing)
// ============================================================================
// Takes the client's full CIE cognitive profile and generates a tactical
// meeting briefing. This is the psychologist whispering in the broker's ear.
// ============================================================================

const SYSTEM_PROMPT = `You are FORGE -- the strategic action layer within PCIS Solutions' intelligence platform. You specialise in preparing senior property advisors for high-stakes client meetings in Dubai's UHNW property market.

You are generating a Meeting Preparation Brief. This brief transforms CIE cognitive intelligence into a practical tactical playbook. The advisor will read this 30 minutes before their meeting and use it as their guide throughout the conversation.

Your brief must have these 6 sections, each as its own paragraph block. Label each section with its heading on a separate line:

CLIENT COGNITIVE PROFILE
Synthesise the CIE archetype and all cognitive dimension scores into a clear portrait of how this client thinks, decides, and communicates. This is not a dry recitation of scores -- it is a narrative explanation of who the advisor is about to sit across from. Connect the data points into behavioural predictions: "With Trust Formation at 38/100 and Information Processing at 82/100, expect a client who arrives having done extensive independent research but remains sceptical of advisor claims. They will verify everything you say."

OPENING STRATEGY
Exactly how to begin the meeting. What should the first 3 minutes look like? Based on the archetype, what opening approach builds rapport most effectively? Should the advisor lead with data, with vision, with relationship-building, or with exclusivity? Provide specific opening lines or framing that aligns with the client's communication preferences. For a decisive archetype: "Open with the headline -- present the strongest match immediately, state the score, and signal that you've done the analytical work so they don't have to."

CONVERSATION ARCHITECTURE
How to structure the flow of the meeting. What topics in what order? When to present data vs when to listen? Based on the client's Decision Velocity and Information Processing scores, how much information can they absorb per segment? When do they need breathing room? Provide a minute-by-minute structure if the meeting is 45-60 minutes. Reference specific cognitive scores to justify each structural choice.

OBJECTION PLAYBOOK
Based on the CIE profile, predict the 3-5 most likely objections this client will raise. For each objection, provide: (1) what triggers it in their cognitive profile, (2) the exact reframe or response, and (3) what data to have ready. This is where CIE intelligence becomes weaponised -- the advisor knows the objection before the client raises it. Tailor responses to the archetype: analytical clients need data, cautious clients need social proof, decisive clients need exclusivity signals.

DECISION TRIGGERS & CLOSING
What moves this specific client toward a decision? Based on their cognitive profile -- Urgency Response, Social Proof Sensitivity, Exclusivity Response, Analytical Depth -- identify the 2-3 most powerful triggers. Provide exact language and framing for each trigger. When in the meeting should the advisor deploy these? What is the closing approach -- ask for the decision directly, or create space for reflection? What follow-up timeline matches their Decision Velocity?

COMMUNICATION DO'S AND DON'TS
A rapid-fire reference list of exactly 5 DO's and 5 DON'T's for communicating with this specific client. Each must be specific and actionable, not generic. Bad: "Be professional." Good: "Mirror their pace -- this client speaks at approximately 70th percentile velocity, maintain a measured but not slow cadence. Avoid pausing for emphasis as they interpret silence as uncertainty."

Write as a senior client strategist briefing an advisor before a critical meeting. Every recommendation must be traceable to a specific CIE data point. No generic advice -- everything must be calibrated to THIS client's specific cognitive profile.`

export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const cogStr = (body.cognitiveScores || [])
      .map((s: any) => `${s.dimension}: ${s.value}/100`)
      .join('\n  ')

    const userMessage = `Generate a Meeting Preparation Brief for this client:

═══ CLIENT IDENTITY ═══
Name: ${body.clientName}
Type: ${body.clientType} | Category: ${body.clientCategory}
Budget Range: AED ${((body.budgetMin || 0) / 1e6).toFixed(1)}M -- AED ${((body.budgetMax || 0) / 1e6).toFixed(1)}M
Location: ${body.location}
Deal Stage: ${body.dealStage}
Days Since Last Contact: ${body.daysSinceContact ?? 'Unknown'}

═══ CIE COGNITIVE INTELLIGENCE ═══
Archetype: ${body.archetypeLabel} (${body.archetype})
Archetype Description: ${body.archetypeDescription || 'N/A'}
Archetype Strengths: ${(body.archetypeStrengths || []).join(', ')}
Archetype Risks: ${(body.archetypeRisks || []).join(', ')}

Cognitive Dimensions:
  ${cogStr}

Key Traits: ${(body.keyTraits || []).join(', ')}
Communication Tips: ${(body.communicationTips || []).join('; ')}
Approach Strategy: ${body.approachStrategy || 'N/A'}

Engagement Score: ${body.engagementScore ?? 'N/A'}/100
Engagement Momentum: ${body.engagementMomentum || 'N/A'}

═══ ACTIVE MATCHES (from ENGINE) ═══
Total Active Matches: ${body.matchCount || 0}
Top Match Score: ${body.topMatchScore || 'N/A'}/100
Purpose Classification: ${body.primaryPurpose || 'N/A'} (Confidence: ${Math.round((body.purposeConfidence || 0) * 100)}%)
${body.topMatches ? `Top Matches:\n${body.topMatches.map((m: any) => `  - ${m.propertyName} (${m.area}): ${m.score}/100 [${m.grade}]`).join('\n')}` : ''}

═══ MEETING CONTEXT ═══
Meeting Type: ${body.meetingType || 'General Review'}
Properties to Discuss: ${(body.propertiesToDiscuss || []).join(', ') || 'General portfolio review'}
Advisor Notes: ${body.advisorNotes || 'None provided'}

Generate the 6-section Meeting Preparation Brief.`

    const result = await callClaude({
      systemPrompt: SYSTEM_PROMPT,
      userMessage,
      maxTokens: 2000,
      temperature: 0.7,
    })

    return NextResponse.json({
      brief: result.content,
      model: result.model,
      tokens: result.tokens,
    })
  } catch (err: any) {
    console.error('FORGE meeting-prep error:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to generate meeting prep' },
      { status: 500 }
    )
  }
}
