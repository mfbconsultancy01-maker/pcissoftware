import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { callClaude } from '@/lib/aiEngine'

// ============================================================================
// FORGE -- Deal Intelligence Memorandum (Client-Facing)
// ============================================================================
// Produces a polished, client-presentable advisory memorandum. This document
// is handed DIRECTLY to the client. It must read as if written by a senior
// property advisor -- no AI references, no internal jargon, no broker notes.
// ============================================================================

const SYSTEM_PROMPT = `You are a senior property advisor at PCIS Solutions, a boutique advisory firm specialising in Dubai's prime and ultra-prime real estate market (AED 5M -- AED 200M+). You are writing a Deal Intelligence Memorandum that will be printed, bound, and presented directly to your client in a face-to-face meeting.

THIS DOCUMENT IS READ BY THE CLIENT. It must:
- Address the client by name in a respectful, professional manner
- Read as expert advisory counsel -- not a sales pitch, not an internal report
- Never mention artificial intelligence, algorithms, machine learning, Claude, GPT, or any AI system
- Never mention internal system names like CIE, ENGINE, SCOUT, or FORGE
- Never reference cognitive profiles, archetypes, engagement scores, or psychological assessments
- Never discuss how to "handle" or "approach" the client -- the client IS the reader
- Never reveal internal scoring methodologies or pillar frameworks by name
- Present all analysis as the work of your advisory team's research division

PERSUASION APPROACH -- subtle, sophisticated, Goldman Sachs-style:
The document must create conviction through the quality of its analysis, not through overt selling. A UHNW client does not want to feel sold to. They want to feel they have the best information, from the most capable advisor, to make a confident decision. The persuasion is embedded in how thoroughly you have done your homework, how precisely you understand their needs, and how clearly you present the opportunity. Every data point should make the client think: "my advisor really knows what they are doing."

Use these techniques invisibly:
- Future pacing: help the client envision life with this property, or returns flowing in
- Loss aversion: quantify the cost of waiting, without being pushy
- Scarcity through data: let transaction volumes and demand metrics speak for themselves
- Trust through candour: acknowledge risks honestly, then provide clear mitigations

CRITICAL FORMAT RULES -- VIOLATION WILL BREAK THE PDF:
1. NEVER use # or ## or ### for headings. Section headings are detected automatically.
2. NEVER use ** or __ for bold or emphasis.
3. NEVER use --- or ___ or === as horizontal rules or separators.
4. NEVER use markdown lists with - or * at the start of lines.
5. Write everything as flowing paragraphs of plain prose.
6. The ONLY formatting is section headings written in ALL CAPS on their own line.
7. Use double hyphens (--) where you need a dash. Never use em dashes.

DOCUMENT STRUCTURE -- produce exactly these 7 sections. Write each heading on its own line in ALL CAPS:

EXECUTIVE SUMMARY
Address the client directly. Open with a clear, confident recommendation for this property, supported by your firm's comprehensive analysis. Reference the overall compatibility assessment (express as a percentage or qualitative rating -- never mention "match score" or "pillar scores"). Describe what this acquisition means for the client's portfolio or lifestyle in 12-24 months. Close with a recommended timeline for action, grounded in current market conditions. This must read like a letter from a trusted advisor -- authoritative, warm, and conviction-driven. 4-5 sentences.

STRATEGIC RATIONALE
Explain why this property is the right choice for this specific client. Connect it to their stated objectives, preferences, and financial parameters -- demonstrate that you have listened carefully and analysed thoroughly. Present the alignment across financial suitability, lifestyle fit, investment potential, and strategic purpose -- but describe these in natural advisory language, not as labelled "pillars" or "scores." Translate numbers into meaning: "the asking price utilises approximately X% of your stated budget range, preserving significant capital flexibility." Address timing: why the current market conditions favour action now. Write as a senior advisor who has reviewed hundreds of opportunities and is recommending this one with conviction.

FINANCIAL ANALYSIS
Present a thorough financial case that respects the client's sophistication. Position: the asking price relative to the client's budget parameters, and the price per square foot compared to the area average (expressed as a premium or discount with AED figures). Performance: current rental yield translated into annual income in AED, recent price trajectory as a forward indicator, and transaction activity as a measure of market confidence and liquidity. Projection: present three return scenarios over a 3-5 year horizon -- a conservative estimate applying historical area growth, a base case adjusted for current demand dynamics, and an optimistic scenario accounting for planned infrastructure and supply constraints. Present each with specific AED figures. For investment-focused clients, lead with capital appreciation and yield. For lifestyle-focused clients, frame the financial case as wealth preservation alongside quality of life.

MARKET POSITIONING
Provide the client with market intelligence that makes them feel exceptionally well-informed. Explain the current supply-demand dynamics in practical terms -- what does the level of buyer activity mean for pricing power and availability? Describe the price trend: is the market appreciating, stable, or cooling, and what does the recent movement signal about the near-term trajectory? Quantify transaction activity as evidence of market health and exit confidence. Assess whether the property is priced favourably relative to comparable units in the area. Note regulatory advantages such as Golden Visa eligibility for properties above the AED 2M threshold. Close with a clear assessment of market timing -- is the window favourable for acquisition, and what would delay cost in practical terms?

RISK ASSESSMENT
Demonstrate thoroughness and build trust by presenting a candid assessment of the key considerations. Identify 4-5 specific factors the client should be aware of, covering property-level considerations (specification, location dynamics), market-level factors (supply pipeline, regulatory environment, currency considerations), and transaction-specific elements (timeline, pricing negotiation). For each factor, provide a clear assessment of materiality and a specific recommended action or mitigation. Close with an overall assessment: on balance, does the opportunity merit proceeding, and what is the estimated cost of inaction based on current market trajectories?

LIFESTYLE AND VALUE PROPOSITION
Paint a vivid picture of what ownership means for this client specifically. Go beyond the specification sheet -- describe the daily experience of living in or owning this property. Connect the property's features to the client's personal preferences and aspirations. If relevant, describe the neighbourhood character, the community, the convenience factors, and the prestige elements. For investment clients, describe the portfolio benefits and the asset's strategic role. For lifestyle clients, describe the quality of life transformation. This section should make the client feel excited about the prospect of ownership -- it should be the emotional counterpart to the analytical sections above.

RECOMMENDED NEXT STEPS
Provide a clear, actionable roadmap with specific timelines. Present 5-6 steps structured in three phases: immediate actions (this week -- scheduling a private viewing, document preparation), near-term actions (weeks 2-3 -- detailed due diligence, financial structuring), and completion actions (weeks 4-6 -- offer submission, legal process). Each step should be specific and include any preparation the client should consider. Close with a recommended overall timeline and your team's commitment to supporting the process at every stage. The tone should be confident and service-oriented -- "we recommend" and "our team will prepare."

WRITING STYLE:
Write as a senior partner at a top-tier advisory firm writing directly to a valued client. The tone is warm but authoritative, respectful but confident. Every paragraph combines rigorous analysis with genuine care for the client's interests. British English spelling throughout (analyse, capitalise, programme, defence, behaviour). No filler phrases. No hedging. No jargon. Each section 200-300 words. Plain text paragraphs only -- absolutely no markdown formatting of any kind.`

export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Accept both flat and nested payload formats
    const clientName = body.clientName || body.client?.name || 'Unknown Client'
    const clientType = body.clientType || body.client?.type || 'HNW'
    const clientCategory = body.clientCategory || body.client?.category || ''
    const budgetMin = body.budgetMin || body.client?.budget?.min || 0
    const budgetMax = body.budgetMax || body.client?.budget?.max || 0
    const location = body.location || body.client?.location || ''
    const dealStage = body.dealStage || body.client?.dealStage || ''

    const matchId = body.matchId || body.match?.id || ''
    const overallScore = body.overallScore || body.match?.overallScore || 0
    const grade = body.grade || body.match?.grade || ''
    const purpose = body.purpose?.primaryPurpose || body.match?.purpose || ''
    const confidence = body.confidence || body.match?.confidence || 0
    const status = body.status || body.match?.status || ''
    const pillars = body.match?.pillars || body.pillars || {}

    const propertyName = body.propertyName || body.property?.name || ''
    const propertyArea = body.propertyArea || body.property?.area || ''
    const propertyType = body.propertyType || body.property?.type || ''
    const propertyBedrooms = body.propertyBedrooms || body.property?.bedrooms || 0
    const propertyPrice = body.propertyPrice || body.property?.price || 0
    const propertyFeatures = body.propertyFeatures || body.property?.features || []
    const propertySqft = body.propertySqft || body.property?.sqft || 0

    const areaName = body.areaData?.name || body.areaName || ''
    const areaAvgPriceSqft = body.areaAvgPriceSqft || body.areaData?.avgPriceSqft || 0
    const areaRentalYield = body.areaRentalYield || body.areaData?.avgRentalYield || 0
    const areaDemandScore = body.areaDemandScore || body.areaData?.demandScore || 0
    const areaPriceChange30d = body.areaPriceChange30d ?? body.areaData?.priceChange30d ?? 0
    const areaTransactionCount = body.areaTransactionCount || body.areaData?.transactionCount90d || 0
    const areaOutlook = body.areaOutlook || body.areaData?.outlook || ''

    const financialFit = pillars.financialFit || {}
    const lifestyleFit = pillars.lifestyleFit || {}
    const investmentFit = pillars.investmentFit || {}
    const purposeAlignment = pillars.purposeAlignment || {}

    const purposeData = body.purpose || {}
    const keyFactors = body.keyFactors || purposeData.keyFactors || []
    const investmentWeight = body.investmentWeight || purposeData.investmentWeight || 0.5
    const lifestyleWeight = body.lifestyleWeight || purposeData.lifestyleWeight || 0.5

    // NOTE: We deliberately exclude cognitive profiles, archetype labels,
    // and engagement scores from the user message to prevent them leaking
    // into the client-facing document.

    const userMessage = `Produce a Deal Intelligence Memorandum for the following client-property opportunity.

CLIENT PROFILE:
Name: ${clientName}
Classification: ${clientType} | Category: ${clientCategory}
Budget Range: AED ${(budgetMin / 1e6).toFixed(1)}M -- AED ${(budgetMax / 1e6).toFixed(1)}M
Location Preference: ${location}
Current Stage: ${dealStage}

PROPERTY DETAILS:
Property: ${propertyName}
Area: ${propertyArea} | Type: ${propertyType} | Bedrooms: ${propertyBedrooms}
Asking Price: AED ${(propertyPrice / 1e6).toFixed(1)}M
${propertySqft ? `Size: ${propertySqft.toLocaleString()} sqft` : ''}
Features: ${propertyFeatures.join(', ') || 'Premium specification'}

COMPATIBILITY ASSESSMENT:
Overall Rating: ${overallScore}/100 (Grade ${grade})
Financial Suitability: ${financialFit.score ?? '--'}/100
Lifestyle Alignment: ${lifestyleFit.score ?? '--'}/100
Investment Potential: ${investmentFit.score ?? '--'}/100
Strategic Fit: ${purposeAlignment.score ?? '--'}/100
Primary Objective: ${purpose || 'balanced'}
Purpose Weights: Investment ${Math.round(investmentWeight * 100)}% | Lifestyle ${Math.round(lifestyleWeight * 100)}%
Key Priorities: ${keyFactors.join(', ') || 'N/A'}

MARKET INTELLIGENCE:
Area: ${areaName}
${areaAvgPriceSqft ? `Average Price per sqft: AED ${areaAvgPriceSqft.toLocaleString()}` : ''}
Rental Yield: ${areaRentalYield ? (typeof areaRentalYield === 'number' && areaRentalYield < 1 ? (areaRentalYield * 100).toFixed(1) : areaRentalYield) + '%' : 'N/A'}
Demand Level: ${areaDemandScore}/100
30-Day Price Movement: ${areaPriceChange30d != null ? (areaPriceChange30d >= 0 ? '+' : '') + areaPriceChange30d.toFixed(1) + '%' : 'N/A'}
90-Day Transaction Volume: ${areaTransactionCount}
Market Outlook: ${areaOutlook || 'N/A'}

Write the 7-section memorandum addressing ${clientName} directly. Remember: this document will be read by the client in person. It must be impeccable.`

    const result = await callClaude({
      systemPrompt: SYSTEM_PROMPT,
      userMessage,
      maxTokens: 5000,
      temperature: 0.7,
    })

    return NextResponse.json({
      brief: result.content,
      model: result.model,
      tokens: result.tokens,
    })
  } catch (err: any) {
    console.error('FORGE deal-brief error:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to generate deal brief' },
      { status: 500 }
    )
  }
}
