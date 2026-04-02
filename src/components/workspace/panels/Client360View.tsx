'use client'

import React, { useState, useMemo } from 'react'
import {
  clients,
  getClient,
  getEngagement,
} from '@/lib/mockData'
import {
  getCIEClient,
  cieClients,
  ARCHETYPES,
  DIMENSION_META,
  type CIEClient,
} from '@/lib/cieData'

// ============================================================================
// Client DNA Report -- CIE Engine Intelligence Brief
// ============================================================================

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white/[0.02] border border-pcis-border/30 rounded-xl backdrop-blur-sm overflow-hidden ${className}`}>
      {children}
    </div>
  )
}

function PanelHeader({ title, accent, right }: { title: string; accent?: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-pcis-border/20">
      <div className="flex items-center gap-2">
        {accent && <div className="w-[3px] h-3.5 rounded-full" style={{ backgroundColor: accent }} />}
        <span className="text-[11px] font-semibold text-pcis-text-secondary uppercase tracking-wider">{title}</span>
      </div>
      {right}
    </div>
  )
}

// ============================================================================
// DIMENSION DESCRIPTOR -- what each score level actually means
// ============================================================================

function getDimensionDescriptor(dimension: string, score: number): string {
  const high = score >= 65
  const low = score < 35
  const mid = !high && !low

  const descriptors: Record<string, { high: string; mid: string; low: string }> = {
    'Trust Formation': {
      high: 'Forms trust quickly. Open to new relationships and willing to take the advisor at their word early in the process. This is an advantage but also means trust can be fragile if expectations are not met.',
      mid: 'Builds trust at a moderate pace. Needs a few positive interactions before feeling comfortable, but will not require excessive proof at every step.',
      low: 'Slow to trust. Requires consistent follow-through, third-party validation, and a track record of reliability before opening up. Every broken promise, however small, will set the relationship back significantly.',
    },
    'Risk Tolerance': {
      high: 'Comfortable with uncertainty and willing to take calculated gambles. Responds well to bold, off-market, and unconventional opportunities. May become bored with overly conservative suggestions.',
      mid: 'Balanced risk appetite. Open to moderate opportunities but wants to understand the downside before committing. Appreciates a mix of safe and stretch options.',
      low: 'Highly risk-averse. Needs extensive reassurance, guarantees, and proof of safety before moving forward. Will walk away from any opportunity that feels speculative, even if the upside is compelling.',
    },
    'Decision Velocity': {
      high: 'Fast decision-maker who values efficiency. Gets frustrated by slow processes, excessive back-and-forth, or being presented with too many options. Expects the advisor to have already done the filtering.',
      mid: 'Decides at a measured pace. Wants enough time to feel confident but does not need weeks. Responds well to structured timelines with clear milestones.',
      low: 'Deliberate and cautious. Takes significant time to weigh all factors before committing. Rushing this client will trigger resistance and potentially end the relationship. Patience is essential.',
    },
    'Price Sensitivity': {
      high: 'Highly price-conscious. Will compare, negotiate, and push for better terms. Expects full transparency on pricing from the outset. Introducing hidden costs or late-stage price increases will destroy trust.',
      mid: 'Price-aware but not purely price-driven. Will pay a premium if the value proposition is clearly articulated, but still expects fair market terms.',
      low: 'Price is not a primary concern. Decisions are driven by quality, exclusivity, and alignment with personal goals rather than cost. Emphasising discounts may actually devalue the offering in their eyes.',
    },
    'Status Orientation': {
      high: 'Motivated by prestige, exclusivity, and social standing. Responds strongly to "first access", "off-market", and "invitation-only" framing. Presenting budget options will feel tone-deaf.',
      mid: 'Appreciates quality and exclusivity but is not primarily driven by status. Values substance over branding.',
      low: 'Indifferent to status signalling. Focused on practical value, functionality, and alignment with personal needs. Luxury framing may feel unnecessary or even off-putting.',
    },
    'Privacy Need': {
      high: 'Extremely private. Prefers one-on-one communication, dislikes being part of group settings, and expects complete discretion about their interests and activities. Never share their information with others.',
      mid: 'Values reasonable privacy but is comfortable in small, curated settings. Fine with selective information sharing when it serves their interests.',
      low: 'Open and social. Comfortable in group settings, happy to network, and does not mind others knowing about their activity. Can be invited to events and group viewings.',
    },
    'Detail Orientation': {
      high: 'Analytical and thorough. Will read every document, question every number, and expect comprehensive data to support every claim. Come over-prepared rather than under-prepared.',
      mid: 'Likes to see key data points but does not need exhaustive detail. A well-structured summary with highlights will satisfy their information needs.',
      low: 'Big-picture thinker. Drowning them in detail will cause disengagement. Present the narrative first, keep the data in reserve for when they ask specific questions.',
    },
    'Emotional Driver': {
      high: 'Decisions are heavily influenced by emotion, gut feeling, and personal connection. The "how it feels" matters more than "what the numbers say". Storytelling and lifestyle framing are essential.',
      mid: 'A blend of rational analysis and emotional intuition. Responds to data but also needs to feel good about the decision. Balance facts with narrative.',
      low: 'Purely rational. Emotional appeals will feel manipulative. Stick to facts, analysis, and logical reasoning. Let the data speak for itself.',
    },
    'Loyalty Tendency': {
      high: 'Once committed, this client is deeply loyal and unlikely to shop around. Investing in the relationship now will yield long-term returns. However, betraying this loyalty will result in permanent loss.',
      mid: 'Moderately loyal. Will stay if the service remains strong, but is open to alternatives if quality drops. Consistent delivery keeps them engaged.',
      low: 'Low loyalty. This client is constantly evaluating alternatives and will switch advisors without hesitation if they perceive a better option. Every interaction must deliver visible value.',
    },
    'Innovation Appetite': {
      high: 'Drawn to novelty, innovation, and cutting-edge opportunities. Excited by first-mover advantages and new concepts. Presenting the same options as everyone else will not hold their attention.',
      mid: 'Open to new ideas when they are well-explained and proven. Not an early adopter, but not resistant to change either.',
      low: 'Prefers proven, established approaches. Sceptical of anything too new or untested. Frame opportunities in terms of track record and precedent rather than innovation.',
    },
    'Negotiation Style': {
      high: 'Assertive negotiator who will push hard on terms, price, and conditions. Expects the advisor to hold their ground professionally. Prepare firm boundaries and value anchors before entering any discussion.',
      mid: 'Willing to negotiate but keeps it collaborative rather than adversarial. A fair initial offer will usually lead to a smooth process.',
      low: 'Non-confrontational. Dislikes negotiation and prefers straightforward, transparent pricing. Making them haggle will create discomfort and may cause them to disengage.',
    },
    'Social Proof Need': {
      high: 'Heavily influenced by what others have done. Testimonials, case studies, and references from similar clients will significantly accelerate their decision-making process.',
      mid: 'Social proof is helpful but not decisive. It supports the decision rather than driving it.',
      low: 'Independent thinker who forms opinions from their own analysis. Referencing what "everyone else" is doing may actually push them in the opposite direction.',
    },
  }

  const desc = descriptors[dimension]
  if (!desc) return 'No descriptor available for this dimension.'
  if (high) return desc.high
  if (low) return desc.low
  return desc.mid
}

// ============================================================================
// AI DNA NARRATIVE GENERATOR
// ============================================================================

function generateDNAReport(cie: CIEClient) {
  const name = cie.client.name.split(' ')[0]
  const fullName = cie.client.name
  const archetype = ARCHETYPES.find(a => a.id === cie.archetype)
  const engagement = cie.engagement
  const scores = new Map(cie.profile?.scores.map(s => [s.dimension, s.value]) || [])

  const dv = scores.get('Decision Velocity') ?? 50
  const rt = scores.get('Risk Tolerance') ?? 50
  const doScore = scores.get('Detail Orientation') ?? 50
  const ed = scores.get('Emotional Driver') ?? 50
  const pn = scores.get('Privacy Need') ?? 50
  const ps = scores.get('Price Sensitivity') ?? 50
  const tf = scores.get('Trust Formation') ?? 50
  const so = scores.get('Status Orientation') ?? 50
  const lt = scores.get('Loyalty Tendency') ?? 50
  const ia = scores.get('Innovation Appetite') ?? 50
  const ns = scores.get('Negotiation Style') ?? 50
  const sp = scores.get('Social Proof Need') ?? 50

  // Executive summary -- multi-paragraph
  const execSummary: string[] = []

  // Opening line based on archetype
  execSummary.push(
    `${fullName} is classified as a "${archetype?.label || cie.archetype}" archetype within the CIE cognitive framework. This classification is derived from the interplay of their 12 cognitive dimensions and reflects how they process information, form decisions, and engage with advisory relationships.`
  )

  // Dominant traits
  const topDims = cie.topDimensions.slice(0, 3)
  const bottomDims = cie.bottomDimensions.slice(0, 3)
  const topNames = topDims.map(d => d.dimension).join(', ')
  const bottomNames = bottomDims.map(d => d.dimension).join(', ')

  execSummary.push(
    `Their strongest cognitive dimensions are ${topNames}, which together define the core of how ${name} approaches decisions and relationships. Conversely, their lowest dimensions are ${bottomNames}, which represent areas where ${name} is either naturally disinclined or where caution is needed in the advisory approach.`
  )

  // Engagement context
  if (engagement) {
    const statusLabel = engagement.status.charAt(0).toUpperCase() + engagement.status.slice(1)
    const momentumLabel = engagement.momentum === 'heating' ? 'accelerating' : engagement.momentum === 'cooling' ? 'decelerating' : 'stable'
    execSummary.push(
      `Current engagement status is ${statusLabel} with ${momentumLabel} momentum. ${engagement.daysSinceContact} days have passed since last contact. Engagement score sits at ${engagement.engagementScore} out of 100, with a decay rate of ${engagement.decayRate}% per cycle.`
    )
  }

  // Personality summary -- richer
  let personalitySummary = ''
  if (ed > 65 && pn > 65) {
    personalitySummary = `${name} is a private, emotionally-driven individual who makes decisions based on how an opportunity feels rather than how it looks on a spreadsheet. They are deeply protective of their personal space and information. The advisory relationship must feel intimate and trustworthy before any business discussion will resonate. Surface-level interactions or group settings will cause them to withdraw. Build rapport through genuine personal connection first, and only then introduce opportunities that align with their vision and values.`
  } else if (ed > 65) {
    personalitySummary = `${name} is primarily driven by emotion and intuition. Their decisions are shaped by how an opportunity feels, the story behind it, and whether it connects with their personal aspirations. Data and analysis are secondary. To engage ${name} effectively, lead with narrative: paint a picture of how an opportunity fits into their life. Visual materials, lifestyle framing, and personal anecdotes from similar clients will resonate far more than financial projections or market comparables.`
  } else if (doScore > 65 && dv < 40) {
    personalitySummary = `${name} is an analytical perfectionist who takes significant time to reach decisions. They will scrutinise every data point, cross-reference information independently, and expect comprehensive documentation at every stage. Rushing this client is counterproductive and will trigger withdrawal. The advisor must be prepared to provide detailed briefing documents in advance, anticipate granular follow-up questions, and allow the decision to unfold at ${name}'s pace. Patience and thoroughness are not optional; they are prerequisites.`
  } else if (doScore > 65) {
    personalitySummary = `${name} is analytically driven and detail-oriented. They will read every document, question every number, and expect thorough data to support every claim made. Come over-prepared rather than under-prepared. Provide written summaries and market evidence proactively. ${name} respects advisors who demonstrate the same level of rigour they apply to their own decisions.`
  } else if (dv > 65 && rt > 65) {
    personalitySummary = `${name} is a bold, fast-moving decision-maker with a high appetite for risk. They value efficiency, dislike bureaucracy, and expect the advisor to have already filtered opportunities down to the top contenders. Presenting too many options or excessive caveats will frustrate them. ${name} responds best to decisive recommendations delivered with confidence. They are drawn to off-market, unconventional, and first-mover opportunities that others might overlook.`
  } else if (dv > 65) {
    personalitySummary = `${name} is a fast, decisive operator who values efficiency above all else. They dislike drawn-out processes, unnecessary meetings, and being presented with too many options. Get to the point quickly, present a clear recommendation with brief supporting rationale, and be ready to move at their pace. If they say yes, have the next steps ready to execute immediately.`
  } else if (dv < 35) {
    personalitySummary = `${name} moves deliberately and needs significant time to process information and reach conclusions. This is not indecisiveness; it is thoroughness. Rushing will create resistance and may permanently damage the relationship. Allow breathing room between touchpoints, frame next steps as invitations rather than deadlines, and demonstrate patience. ${name} will commit when they are ready, and that commitment will be solid.`
  } else if (so > 70 && ps < 35) {
    personalitySummary = `${name} is status-conscious and price-insensitive, a combination that responds strongly to exclusivity, prestige, and "invitation-only" framing. They want to feel that what they are being offered is not available to everyone. Presenting budget options or emphasising cost savings will feel tone-deaf. Instead, lead with the story of why this opportunity is special, who else has been involved, and what makes it rare.`
  } else {
    personalitySummary = `${name} has a balanced cognitive profile without extreme tendencies in any single dimension. This means they respond well to a structured but flexible approach that combines data with narrative, logic with emotion, and thoroughness with efficiency. The advisor has room to adapt their style, but should aim for a professional, well-organised interaction that covers both the analytical and personal dimensions of any opportunity.`
  }

  // Communication do's and don'ts -- more descriptive
  const commDos: string[] = []
  const commDonts: string[] = []

  if (pn > 65) {
    commDos.push('Always communicate through private, one-on-one channels. Never add them to group emails, shared updates, or mass communications without explicit permission.')
    commDos.push('Demonstrate discretion about their interests, viewing activity, and any personal information shared during conversations.')
    commDonts.push('Never include them in group presentations, open houses, or shared client events without asking first.')
    commDonts.push('Never discuss their profile, preferences, or activity with other clients, even in general terms.')
  } else if (pn < 35) {
    commDos.push('Invite them to exclusive group viewings, networking events, and curated client gatherings. They are energised by social interaction and community.')
  }

  if (ed > 60) {
    commDos.push('Use storytelling, lifestyle imagery, and experiential framing in all presentations. Show them the life they could have, not just the numbers behind it.')
    commDos.push('Connect every opportunity to their personal aspirations and values. The "why this matters to you" is more important than the "what the numbers show".')
    commDonts.push('Never lead with spreadsheets, raw financial data, or dense analytical reports. The emotional connection must come first.')
  } else if (doScore > 60) {
    commDos.push('Lead every interaction with data, market comparables, and evidence-based analysis. Provide written summaries that they can review at their own pace.')
    commDos.push('Prepare documentation proactively. If they have to ask for data you should have already provided, you have lost ground.')
    commDonts.push('Never rely on verbal assurances without accompanying documentation. If it is not written down, it does not exist for this client.')
  }

  if (dv > 60) {
    commDos.push('Keep all communications concise and action-oriented. Respect their time by getting to the point quickly and clearly.')
    commDonts.push('Never overload them with options, unnecessary background, or open-ended questions. They expect you to have already done the thinking.')
  } else if (dv < 40) {
    commDos.push('Give advance notice before meetings, viewings, or any situation requiring a decision. They need time to mentally prepare.')
    commDonts.push('Never spring surprises, create artificial urgency, or pressure them with deadlines. It will backfire.')
  }

  if (tf < 40) {
    commDos.push('Follow through on every commitment, no matter how small. Each fulfilled promise builds trust incrementally with this client.')
    commDos.push('Proactively provide independent verification, third-party references, and documented evidence to support your claims.')
    commDonts.push('Never make promises you cannot 100% guarantee. A single broken commitment can undo months of relationship building.')
  }

  if (sp > 65) {
    commDos.push('Reference similar clients who have taken similar paths and share their outcomes. Testimonials and case studies are powerful tools with this client.')
  }

  if (so > 65) {
    commDos.push('Emphasise exclusivity, prestige, and status elements in every presentation. Frame opportunities as rare, curated, and not available to the general market.')
    commDonts.push('Never present budget-tier options or emphasise cost savings. It signals that you do not understand their positioning.')
  }

  if (rt < 35) {
    commDos.push('Always emphasise safety nets, guarantees, exit strategies, and proven track records. Frame every opportunity in terms of downside protection first.')
    commDonts.push('Never lead with high-risk, speculative, or unproven opportunities. Even mentioning them first will create anxiety that colours the entire conversation.')
  } else if (rt > 70) {
    commDos.push('Present bold, off-market, and unconventional opportunities that others might not have access to. This client thrives on calculated risk.')
    commDonts.push('Never over-hedge or make everything sound safe and conservative. It will bore them and suggest you are not thinking big enough.')
  }

  if (ps > 65) {
    commDos.push('Be fully transparent about pricing, fees, and total costs from the very first conversation. Surprises later will destroy credibility.')
    commDonts.push('Never introduce price escalations, hidden fees, or adjusted terms late in the process. This client will feel deceived.')
  }

  if (ns > 60) {
    commDonts.push('Never enter a pricing discussion without prepared boundaries and value anchors. This client will negotiate assertively and you need to hold your position with confidence.')
  }

  // Meeting prep -- richer
  let meetingPrep = ''
  if (ed > 60 && pn > 60) {
    meetingPrep = `Schedule the meeting in a private, comfortable setting away from busy offices or public spaces. Begin with 10 to 15 minutes of genuine personal conversation before transitioning to business. Have high-quality visual materials prepared but do not lead with them; let ${name} signal when they are ready to discuss specifics. Prepare a maximum of 2 to 3 carefully tailored options. If presenting property or investment opportunities, frame each one in terms of lifestyle impact rather than financial metrics. End the meeting by confirming the next touchpoint on their terms, not yours.`
  } else if (doScore > 60 && dv < 40) {
    meetingPrep = `Send a comprehensive briefing document at least 48 hours before the meeting. Include all relevant data, comparables, legal considerations, and market context. ${name} will arrive having read everything and will come with detailed questions. Structure the meeting around their questions rather than a pre-set agenda. Have additional layers of data available for when they probe deeper. Do not rush any section. Plan for the meeting to run 20 to 30% longer than you would normally schedule. Confirm follow-up items in writing within 24 hours.`
  } else if (doScore > 60) {
    meetingPrep = `Prepare a detailed briefing document and send it 24 hours before the meeting. ${name} will come prepared with questions and expects you to have the same level of preparation. Have market data, comparable analysis, and legal details readily accessible. Structure the discussion around evidence and allow ample time for Q&A. Follow up with a written summary of everything discussed.`
  } else if (dv > 60 && rt > 60) {
    meetingPrep = `Keep the agenda tight and action-oriented: 5 minutes of context, then straight to your top 2 recommendations. ${name} expects you to have already filtered everything down. Present with confidence and conviction. Have next-step actions prepared for immediate execution if they give the green light. Do not fill time with caveats or excessive background. If they want more detail, they will ask.`
  } else if (dv > 60) {
    meetingPrep = `Keep the agenda tight: 10 minutes maximum for context, then straight to recommendations. ${name} expects you to have already filtered options down to the best 2. Present clearly with a recommended path forward. Have next-step documents, contracts, or actions ready to execute immediately if they say yes. Respect their time by ending on schedule or early.`
  } else if (so > 65) {
    meetingPrep = `Select a venue or setting that reflects the exclusivity of the service. First impressions matter with ${name}. Present opportunities with premium materials and framing. Emphasise what makes each option rare or special. Avoid any language that suggests "budget" or "starter". Have an exclusive detail ready that shows you have access others do not.`
  } else {
    meetingPrep = `Structure the meeting with a clear agenda but leave room for organic discussion. Balance data with narrative across 3 well-prepared options, each with a clear recommendation and reasoning. Allow ${name} to ask questions at each stage and adjust the depth of discussion based on their signals. Follow up within 24 hours with a written summary and clear next steps.`
  }

  // Relationship risk factors -- enriched
  const risks: string[] = []
  if (lt < 40) risks.push('Low loyalty tendency. This client is constantly evaluating alternatives and will switch advisors without hesitation if they perceive a better option elsewhere. Every single interaction must deliver visible, tangible value. Complacency is the fastest path to losing this client.')
  if (tf < 40) risks.push('Slow trust formation. Building genuine confidence with this client takes significantly longer than average. Avoid pushing for commitment before trust is fully established. Every unfulfilled promise, delayed response, or inconsistency will set the relationship back further than you think.')
  if (engagement?.status === 'cooling' || engagement?.status === 'cold') {
    risks.push(`Engagement is currently ${engagement.status} with ${engagement.daysSinceContact} days since last meaningful contact. This is approaching a critical threshold. Without re-engagement within the next 7 to 10 days, the probability of relationship recovery drops significantly. Prioritise a personalised, high-value touchpoint immediately.`)
  }
  if (engagement?.momentum === 'cooling') {
    risks.push('Engagement momentum is decelerating. The client is becoming less responsive, interactions are shortening, and proactive outreach is declining. This trend will continue unless the advisor introduces a meaningful change in approach or presents something that reignites interest.')
  }
  if (ns > 70) risks.push('Assertive negotiation style. This client will push hard on terms, pricing, and conditions. If you enter a negotiation unprepared, you will lose ground quickly. Prepare firm value anchors, know your walk-away points, and maintain professional confidence throughout.')
  if (rt < 30 && tf < 40) risks.push('The combination of high risk aversion and slow trust formation creates a compound challenge. This client needs extensive reassurance AND time to process it. Double the patience you think is required.')
  if (pn > 70 && engagement?.status === 'cooling') risks.push('A privacy-oriented client whose engagement is cooling is especially difficult to re-engage. Standard outreach may feel intrusive. Consider a soft, indirect approach such as sending a personalised market update without any call-to-action.')

  // Strengths to leverage -- enriched
  const strengths: string[] = []
  if (lt > 65) strengths.push('High loyalty tendency. Once ${name} commits to a relationship, they are unlikely to leave. This means the investment you make now in building the relationship will compound over time. Protect this loyalty by maintaining consistent quality and never taking it for granted.'.replace('${name}', name))
  if (sp > 65) strengths.push('Strong social proof responsiveness. Successful case studies, testimonials, and references from clients in similar situations will significantly accelerate the decision-making process. Prepare 2 to 3 relevant success stories before major interactions.')
  if (ia > 65) strengths.push('High innovation appetite. This client is energised by novelty and will respond enthusiastically to cutting-edge opportunities, first-mover propositions, and ideas that feel ahead of the market. Use this to differentiate yourself from other advisors.')
  if (tf > 65) strengths.push('Fast trust formation. This client is naturally open and willing to give the advisor the benefit of the doubt early on. Use this window to build a strong foundation by delivering immediate value and setting positive expectations.')
  if (engagement?.status === 'thriving') strengths.push('Engagement is currently thriving with strong momentum. This is the ideal window for presenting premium opportunities, upselling services, or deepening the relationship through a strategic review session.')
  if (so > 65 && ps < 40) strengths.push('Status-driven and price-insensitive. This is an ideal profile for premium, high-margin opportunities. Frame everything around exclusivity and prestige.')
  if (ed > 60 && lt > 60) strengths.push('Emotionally connected and loyal. When this client bonds with an advisor, the relationship becomes deeply personal. Nurture this connection and it will generate long-term referrals and sustained engagement.')

  return {
    execSummary,
    personalitySummary,
    commDos: commDos.slice(0, 7),
    commDonts: commDonts.slice(0, 6),
    meetingPrep,
    risks,
    strengths,
    archetype,
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function Client360View({ entityId }: { entityId?: string }): React.ReactElement {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(entityId || cieClients[0]?.client.id || null)
  const [userHasSelected, setUserHasSelected] = useState(false)

  // Once the user picks from the dropdown, their choice takes priority over entityId
  const activeId = (userHasSelected ? selectedClientId : entityId) || selectedClientId
  const cieClient = useMemo(() => activeId ? getCIEClient(activeId) : undefined, [activeId])

  const handleClientChange = (newId: string) => {
    setSelectedClientId(newId)
    setUserHasSelected(true)
  }

  if (!cieClient) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-[10px] text-pcis-text-muted">Client not found in CIE engine</p>
      </div>
    )
  }

  const client = cieClient.client
  const engagement = cieClient.engagement
  const archetype = ARCHETYPES.find(a => a.id === cieClient.archetype)
  const dna = generateDNAReport(cieClient)

  const getScoreColor = (score: number): string => {
    if (score >= 75) return '#C9A55A'
    if (score >= 50) return '#22c55e'
    if (score >= 25) return '#f59e0b'
    return '#ef4444'
  }

  const getScoreLabel = (score: number): string => {
    if (score >= 75) return 'Very High'
    if (score >= 60) return 'High'
    if (score >= 40) return 'Moderate'
    if (score >= 25) return 'Low'
    return 'Very Low'
  }

  const engagementColor = engagement ? (
    engagement.status === 'thriving' ? '#22c55e' :
    engagement.status === 'active' ? '#06b6d4' :
    engagement.status === 'cooling' ? '#f59e0b' :
    engagement.status === 'cold' ? '#3b82f6' : '#6b7280'
  ) : '#6b7280'

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      {/* Header with Dropdown */}
      <div className="px-4 py-3 border-b border-pcis-border/20 flex-shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-[13px] font-semibold text-white mb-1.5" style={{ fontFamily: "'Playfair Display', serif" }}>
              Client DNA Report
            </h2>
            {/* Client Dropdown */}
            <select
              value={activeId || ''}
              onChange={e => handleClientChange(e.target.value)}
              className="w-full bg-white/[0.04] border border-pcis-border/30 rounded-lg text-[11px] text-white px-3 py-2 focus:outline-none focus:border-pcis-gold/50 transition-colors appearance-none cursor-pointer hover:bg-white/[0.06]"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23C9A55A' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
            >
              {cieClients.map(c => {
                const arch = ARCHETYPES.find(a => a.id === c.archetype)
                return (
                  <option key={c.client.id} value={c.client.id}>
                    {c.client.name} | {arch?.label || c.archetype} | CIE {c.overallCIEScore}
                  </option>
                )
              })}
            </select>
          </div>
          <div className="flex flex-col items-end gap-0.5 flex-shrink-0 pt-1">
            <span className="text-[22px] font-bold text-pcis-gold leading-none" style={{ fontFamily: "'Playfair Display', serif" }}>
              {cieClient.overallCIEScore}
            </span>
            <span className="text-[8px] text-pcis-text-muted tracking-wider">CIE SCORE</span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="px-4 py-2.5 border-b border-pcis-border/10 flex-shrink-0">
        <div className="grid grid-cols-5 gap-2">
          <div className="text-center">
            <span className="text-[8px] text-pcis-text-muted block">Category</span>
            <span className="text-[10px] font-semibold text-pcis-text-primary block mt-0.5">{client.category}</span>
          </div>
          <div className="text-center">
            <span className="text-[8px] text-pcis-text-muted block">Location</span>
            <span className="text-[10px] font-semibold text-pcis-text-primary block mt-0.5">{client.location?.split(',')[0]}</span>
          </div>
          <div className="text-center">
            <span className="text-[8px] text-pcis-text-muted block">Engagement</span>
            <span className="text-[10px] font-semibold block mt-0.5" style={{ color: engagementColor }}>
              {engagement ? engagement.status.charAt(0).toUpperCase() + engagement.status.slice(1) : 'N/A'}
            </span>
          </div>
          <div className="text-center">
            <span className="text-[8px] text-pcis-text-muted block">Signals</span>
            <span className="text-[10px] font-mono font-semibold text-cyan-400 block mt-0.5">{cieClient.signalCount}</span>
          </div>
          <div className="text-center">
            <span className="text-[8px] text-pcis-text-muted block">Last Contact</span>
            <span className="text-[10px] font-mono font-semibold text-pcis-text-primary block mt-0.5">
              {engagement ? `${engagement.daysSinceContact}d` : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto space-y-3 p-4">

        {/* Executive Summary */}
        <Panel>
          <PanelHeader title="Executive Summary" accent="#C9A55A" />
          <div className="px-4 py-3 space-y-2.5">
            {dna.execSummary.map((para, i) => (
              <p key={i} className="text-[10px] text-pcis-text-secondary leading-relaxed">{para}</p>
            ))}
          </div>
        </Panel>

        {/* Archetype Card */}
        <Panel>
          <PanelHeader title="Cognitive Archetype" accent={archetype?.color || '#C9A55A'} />
          <div className="px-4 py-3">
            <div className="flex items-center gap-3 mb-3">
              <span
                className="text-[11px] font-bold px-3 py-1.5 rounded-lg border"
                style={{
                  color: archetype?.color || '#C9A55A',
                  backgroundColor: `${archetype?.color || '#C9A55A'}15`,
                  borderColor: `${archetype?.color || '#C9A55A'}40`,
                }}
              >
                {archetype?.label || cieClient.archetype}
              </span>
              <span className="text-[9px] text-pcis-text-muted">
                {client.type} | {client.category}
              </span>
            </div>
            <p className="text-[10px] text-pcis-text-secondary leading-relaxed mb-3">
              {archetype?.description}
            </p>
            {archetype?.strengths && (
              <div className="flex flex-wrap gap-1.5">
                {archetype.strengths.map((trait: string, idx: number) => (
                  <span key={idx} className="text-[8px] bg-pcis-gold/10 text-pcis-gold px-2 py-0.5 rounded border border-pcis-gold/20">
                    {trait}
                  </span>
                ))}
              </div>
            )}
          </div>
        </Panel>

        {/* Personality Profile */}
        <Panel>
          <PanelHeader title="Personality Profile" accent="#C9A55A" />
          <div className="px-4 py-3">
            <div className="bg-pcis-gold/[0.06] border border-pcis-gold/20 rounded-xl p-4">
              <p className="text-[10px] text-pcis-text-secondary leading-[1.7]">{dna.personalitySummary}</p>
            </div>
          </div>
        </Panel>

        {/* 12-Dimension Cognitive Map with Descriptors */}
        <Panel>
          <PanelHeader title="12-Dimension Cognitive Map" accent="#a78bfa" right={
            <span className="text-[8px] text-pcis-text-muted font-mono">CIE/{cieClient.overallCIEScore}</span>
          } />
          <div className="px-4 py-3 space-y-4">
            {DIMENSION_META.map(dim => {
              const score = cieClient.profile?.scores.find(s => s.dimension === dim.name)?.value ?? 0
              const descriptor = getDimensionDescriptor(dim.name, score)
              return (
                <div key={dim.name} className="pb-3 border-b border-pcis-border/10 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-semibold text-pcis-text-primary">{dim.name}</span>
                      <span className="text-[8px] px-1.5 py-0.5 rounded" style={{
                        color: getScoreColor(score),
                        backgroundColor: `${getScoreColor(score)}15`,
                      }}>
                        {getScoreLabel(score)}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold" style={{ color: getScoreColor(score) }}>{score}</span>
                  </div>
                  <div className="h-[4px] bg-white/[0.04] rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${score}%`, backgroundColor: getScoreColor(score) }}
                    />
                  </div>
                  <p className="text-[9px] text-pcis-text-muted leading-relaxed">{descriptor}</p>
                </div>
              )
            })}
          </div>
        </Panel>

        {/* Communication Playbook */}
        <Panel>
          <PanelHeader title="Communication Playbook" accent="#22c55e" />
          <div className="px-4 py-3">
            {dna.commDos.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-[3px] h-3.5 rounded-full bg-green-500" />
                  <span className="text-[10px] font-semibold text-green-400 uppercase tracking-wider">Do</span>
                </div>
                <div className="space-y-2.5">
                  {dna.commDos.map((item, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <span className="text-green-400 text-[9px] mt-0.5 flex-shrink-0 font-bold">+</span>
                      <p className="text-[10px] text-pcis-text-secondary leading-relaxed">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {dna.commDonts.length > 0 && (
              <div className="pt-3 border-t border-pcis-border/15">
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-[3px] h-3.5 rounded-full bg-red-500" />
                  <span className="text-[10px] font-semibold text-red-400 uppercase tracking-wider">Do Not</span>
                </div>
                <div className="space-y-2.5">
                  {dna.commDonts.map((item, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <span className="text-red-400 text-[9px] mt-0.5 flex-shrink-0 font-bold">-</span>
                      <p className="text-[10px] text-pcis-text-secondary leading-relaxed">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Panel>

        {/* Meeting Preparation */}
        <Panel>
          <PanelHeader title="Meeting Preparation Guide" accent="#06b6d4" />
          <div className="px-4 py-3">
            <div className="bg-white/[0.03] border border-pcis-border/20 rounded-xl p-4">
              <p className="text-[10px] text-pcis-text-secondary leading-[1.7]">{dna.meetingPrep}</p>
            </div>
          </div>
        </Panel>

        {/* Strengths to Leverage */}
        {dna.strengths.length > 0 && (
          <Panel>
            <PanelHeader title="Strengths to Leverage" accent="#22c55e" />
            <div className="px-4 py-3 space-y-2.5">
              {dna.strengths.map((item, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="text-green-400 text-[9px] mt-0.5 flex-shrink-0 font-bold">+</span>
                  <p className="text-[10px] text-pcis-text-secondary leading-relaxed">{item}</p>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {/* Risk Factors */}
        {dna.risks.length > 0 && (
          <Panel>
            <PanelHeader title="Risk Factors" accent="#ef4444" right={
              <span className="text-[8px] text-red-400/70 font-mono">{dna.risks.length} identified</span>
            } />
            <div className="px-4 py-3 space-y-2.5">
              {dna.risks.map((item, i) => (
                <div key={i} className="flex items-start gap-2.5 bg-red-500/[0.04] border border-red-500/10 rounded-lg p-3">
                  <span className="text-red-400 text-[9px] mt-0.5 flex-shrink-0 font-bold">!</span>
                  <p className="text-[10px] text-pcis-text-secondary leading-relaxed">{item}</p>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {/* Engine Attribution */}
        <div className="flex items-center gap-2 px-4 pb-2">
          <span className="text-pcis-gold text-[9px]">&#9670;</span>
          <span className="text-[8px] text-pcis-text-muted">CIE DNA Engine v2.1 | Generated from real-time cognitive profiling across 12 dimensions</span>
        </div>
      </div>
    </div>
  )
}
