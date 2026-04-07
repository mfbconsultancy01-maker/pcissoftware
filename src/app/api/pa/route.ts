import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

// ============================================================================
// PCIS Personal Assistant -- Orchestrating API Route
// ============================================================================
// The PA is the command layer. It receives the user's question, classifies
// which engine(s) are relevant, queries them for LIVE data, then synthesises
// a polished response enriched with real intelligence.
//
// Flow:
//   User question → PA classifier → Engine Agent(s) → PA synthesis → Response
//
// Engine agents:
//   E1 CIE  — POST /api/cie-agent/chat  (live Copper client data)
//   E2 SCOUT — POST /api/scout-agent/chat (live market intelligence)
//   E3 ENGINE — GET /api/engine/status    (matching stats)
//   E4 FORGE — (request-response, no chat endpoint yet)
// ============================================================================

const P1_BACKEND_URL = process.env.P1_BACKEND_URL || 'https://pcisp1-production.up.railway.app'
const SERVICE_API_KEY = process.env.P1_SERVICE_API_KEY || ''
const COMMAND_CENTER_URL = process.env.COMMAND_CENTER_URL || 'https://pcis-command-center.vercel.app'

// ── Org resolution cache (same pattern as P1 proxy) ────────────────────────
const orgCache = new Map<string, { p1OrgId: string; resolvedAt: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000

async function resolveOrgId(clerkOrgId: string): Promise<string | null> {
  const cached = orgCache.get(clerkOrgId)
  if (cached && Date.now() - cached.resolvedAt < CACHE_TTL_MS) {
    return cached.p1OrgId
  }
  try {
    const res = await fetch(`${COMMAND_CENTER_URL}/api/franklin/vega`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resolve-org', clerkOrgId }),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return cached?.p1OrgId || null
    const data = await res.json()
    if (data.tenantId) {
      orgCache.set(clerkOrgId, { p1OrgId: data.tenantId, resolvedAt: Date.now() })
      return data.tenantId
    }
    return null
  } catch {
    return cached?.p1OrgId || null
  }
}

// ── Call a P1 backend engine endpoint ───────────────────────────────────────
async function callEngine(
  path: string,
  orgId: string,
  body?: Record<string, unknown>,
  method: 'GET' | 'POST' = 'POST'
): Promise<{ ok: boolean; data: any }> {
  try {
    const res = await fetch(`${P1_BACKEND_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Org-Id': orgId,
        ...(SERVICE_API_KEY ? { 'X-API-Key': SERVICE_API_KEY } : {}),
      },
      ...(method === 'POST' && body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) {
      console.warn(`[PA] Engine ${path} returned ${res.status}`)
      return { ok: false, data: null }
    }
    const json = await res.json()
    return { ok: true, data: json }
  } catch (err: any) {
    console.warn(`[PA] Engine ${path} error:`, err.message)
    return { ok: false, data: null }
  }
}

// ── Engine classification ───────────────────────────────────────────────────
// Determines which engines to query based on the user's latest message.
// Returns a set of engine keys. Uses keyword matching for speed.
type EngineKey = 'cie' | 'scout' | 'engine' | 'forge'

function classifyEngines(message: string): Set<EngineKey> {
  const m = message.toLowerCase()
  const engines = new Set<EngineKey>()

  // CIE triggers: client names, profiles, engagement, cognitive, archetype
  const ciePatterns = [
    'client', 'profile', 'engagement', 'cognitive', 'archetype', 'at risk',
    'at-risk', 'cooling', 'cold', 'dormant', 'thriving', 'portfolio',
    'how is', 'how are', 'status', 'briefing', 'morning brief', 'cie',
    'contact', 'who', 'relationship', 'person', 'people', 'investor',
    'buyer', 'seller', 'prediction', 'flight risk', 'decision velocity',
    'risk tolerance', 'trust', 'sentiment', 'behaviour', 'behavior',
  ]
  if (ciePatterns.some((p) => m.includes(p))) engines.add('cie')

  // SCOUT triggers: market, area, property, prices, yield, transactions
  const scoutPatterns = [
    'market', 'area', 'palm', 'downtown', 'marina', 'jbr', 'difc',
    'business bay', 'dubai', 'property', 'properties', 'price', 'yield',
    'rental', 'transaction', 'dld', 'demand', 'scout', 'intel',
    'neighbourhood', 'neighborhood', 'trend', 'anomal', 'opportunity',
    'sqft', 'square', 'bullish', 'bearish', 'outlook',
  ]
  if (scoutPatterns.some((p) => m.includes(p))) engines.add('scout')

  // ENGINE triggers: match, compatibility, scoring, pillar
  const enginePatterns = [
    'match', 'compatible', 'compatibility', 'score', 'pillar', 'engine',
    'suitab', 'alignment', 'recommend a property', 'find a property',
    'best property', 'which property',
  ]
  if (enginePatterns.some((p) => m.includes(p))) engines.add('engine')

  // FORGE triggers: draft, email, whatsapp, meeting prep, memo, communication
  const forgePatterns = [
    'draft', 'email', 'whatsapp', 'message', 'meeting prep', 'memo',
    'memorandum', 'communication', 'write', 'compose', 'forge', 'action',
    'deal room', 'call script', 'brief for',
  ]
  if (forgePatterns.some((p) => m.includes(p))) engines.add('forge')

  // If nothing matched (general/greeting/feedback), don't query any engine
  return engines
}

// ── Query engines in parallel and build intelligence block ──────────────────
async function gatherEngineIntelligence(
  message: string,
  engines: Set<EngineKey>,
  orgId: string
): Promise<string> {
  if (engines.size === 0) return ''

  const results: string[] = []
  const promises: Promise<void>[] = []

  if (engines.has('cie')) {
    promises.push(
      callEngine('/api/cie-agent/chat', orgId, { message, history: [] }).then(
        ({ ok, data }) => {
          if (ok && data?.data?.reply) {
            results.push(
              `[ENGINE 1 -- CIE INTELLIGENCE (live from Copper CRM)]:\n${data.data.reply}\n` +
              (data.data.context
                ? `Context: ${data.data.context.totalClients} clients, ${data.data.context.atRiskCount} at-risk`
                : '')
            )
          }
        }
      )
    )
  }

  if (engines.has('scout')) {
    promises.push(
      callEngine('/api/scout-agent/chat', orgId, { message, history: [] }).then(
        ({ ok, data }) => {
          if (ok && data?.data?.reply) {
            results.push(
              `[ENGINE 2 -- SCOUT INTELLIGENCE (live market data)]:\n${data.data.reply}\n` +
              (data.data.context
                ? `Context: ${data.data.context.totalProperties} properties, ${data.data.context.totalAreas} areas, ${data.data.context.anomalyCount} anomalies`
                : '')
            )
          }
        }
      )
    )
  }

  if (engines.has('engine')) {
    promises.push(
      callEngine('/api/engine/status', orgId, undefined, 'GET').then(
        ({ ok, data }) => {
          if (ok && data?.data) {
            const s = data.data
            results.push(
              `[ENGINE 3 -- MATCHING STATUS (live)]:\n` +
              `Last run: ${s.lastRun || 'never'}, ` +
              `Total matches: ${s.totalMatches || 0}, ` +
              `Active matches: ${s.activeMatches || 0}`
            )
          }
        }
      )
    )
  }

  if (engines.has('forge')) {
    // FORGE has no chat endpoint -- note this to the PA so it can still advise
    results.push(
      `[ENGINE 4 -- FORGE (action layer)]:\nFORGE is available for drafting communications, meeting briefs, and opportunity scans. ` +
      `To use it, the advisor should open the FORGE panel in the workspace and select a client + action type.`
    )
  }

  await Promise.allSettled(promises)

  if (results.length === 0) return ''

  return (
    '\n\n--- LIVE ENGINE INTELLIGENCE (gathered for this question) ---\n' +
    results.join('\n\n') +
    '\n--- END ENGINE INTELLIGENCE ---'
  )
}

// ── PA System Prompt ────────────────────────────────────────────────────────
const PA_SYSTEM_PROMPT = `You are the Personal Assistant of PCIS Solutions -- a Private Client Intelligence System built for luxury real estate brokers in Dubai. You serve as the broker's right hand: knowledgeable, discreet, and impeccably professional.

YOUR IDENTITY:
- You are "the PA" -- never refer to yourself as an AI, chatbot, or assistant bot.
- You speak in refined British English -- the register of a senior private banker. Warm but never casual. Concise but never curt.
- You address the user by their first name when you know it.
- You use "one" where appropriate ("one might consider..."), employ measured understatement, and avoid American colloquialisms.
- You never use em dashes. Use double hyphens (--) instead.
- You never use bullet points unless explicitly asked. Respond in flowing prose.
- You never say "I'm an AI" or "As an AI" or mention Claude, GPT, Anthropic, or OpenAI.
- You never use the words "delve", "leverage", "utilize", "streamline", or "holistic".

YOUR ARCHITECTURE -- ENGINE REPRESENTATIVES:
You are the senior orchestrator. Four specialist engine representatives report to you:

ENGINE 1 -- CIE (Client Intelligence Engine):
- Its representative knows every client: cognitive profiles, archetypes, engagement scores, risk flags, decision velocity, trust formation -- all derived from live Copper CRM data.
- When you need client intelligence, you consult CIE. Its live data appears in your context automatically.

ENGINE 2 -- SCOUT (Market Intelligence):
- Its representative knows the Dubai property market: area metrics, demand scores, rental yields, price movements, transaction volumes, anomalies, and opportunities.
- When you need market intelligence, you consult SCOUT. Its live data appears in your context automatically.

ENGINE 3 -- ENGINE (Matching & Scoring):
- Matches clients to properties using 4 pillars: Financial Suitability, Lifestyle Alignment, Investment Potential, Purpose Alignment.
- Produces compatibility scores (0-100) and grades (A+ to D).

ENGINE 4 -- FORGE (Action Layer):
- Generates communication drafts (emails, WhatsApp messages, call scripts), meeting briefs, opportunity scans, and Deal Intelligence Memoranda.
- Available in the workspace panel for the advisor to use directly.

HOW YOU USE ENGINE DATA:
When live engine intelligence is provided in your context (between --- LIVE ENGINE INTELLIGENCE --- markers), you MUST use that data to answer the question. Synthesise the raw engine intelligence into your polished PA voice. Do NOT say "the CIE engine reports..." -- instead, speak as though you know this yourself: "Your client portfolio currently holds 10 active profiles, with two showing cooling engagement..."

If no engine data is provided (for general questions, greetings, or platform guidance), respond from your general knowledge of the PCIS platform.

THE DASHBOARD:
- Portfolio Health: breakdown of client statuses (Thriving, Active, Cooling, Cold, Dormant)
- Deal Pipeline: visual pipeline by stage (Lead In through Closed Won / Closed Lost)
- Client Watchlist: priority clients with engagement trends and predictions
- Active Matches: current client-property pairings with compatibility scores
- Action Queue: time-sensitive tasks generated by the system
- Market Intel: latest property market signals from SCOUT

THE WORKSPACE:
- Multi-panel workspace where brokers can open any combination of panels
- Panels include: CIE Dossier, SCOUT Area Intel, Match Analysis, FORGE Deal Room, etc.

FEEDBACK AND ISSUE REPORTING:
Users may report bugs, suggest improvements, or share feedback about the platform through you. When this happens:
- Acknowledge their feedback warmly and professionally.
- Confirm you have noted it and that it will be passed along to the development team.
- IMPORTANT: When the user's message is feedback, a bug report, a suggestion, or a complaint about the platform, you MUST include the exact tag [FEEDBACK] at the very end of your response.

HOW TO RESPOND:
- Use live engine intelligence when available -- weave it naturally into your response.
- Keep responses concise -- typically 2-4 sentences for simple queries, up to 2-3 short paragraphs for complex ones.
- If engine data is thin or an engine was unreachable, mention the relevant panel the advisor can check directly.

OPENING GREETING (use only for the first message of a conversation):
Greet the user warmly by name, introduce yourself as their PA, and ask how you may be of service. Example: "Good afternoon, Michael. Your PA is at your service -- how may I support you today?"
Use the appropriate time-of-day greeting (morning before 12, afternoon before 17, evening after).`

// ── Route Handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { userId, orgId: clerkOrgId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { messages, userName, tenantName } = body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 })
    }

    // ── Resolve tenant org for engine queries ───────────────────────────
    let p1OrgId: string | null = null
    if (clerkOrgId) {
      p1OrgId = await resolveOrgId(clerkOrgId)
    }

    // ── Classify which engines to consult ───────────────────────────────
    const lastUserMsg = messages
      .filter((m: { role: string }) => m.role === 'user')
      .pop()
    const userQuestion = lastUserMsg?.content || ''
    const isGreeting = userQuestion.includes('[PA opened')

    let engineIntelligence = ''
    if (!isGreeting && p1OrgId) {
      const engines = classifyEngines(userQuestion)
      if (engines.size > 0) {
        console.log(`[PA] Consulting engines: ${[...engines].join(', ')} for: "${userQuestion.substring(0, 60)}..."`)
        engineIntelligence = await gatherEngineIntelligence(userQuestion, engines, p1OrgId)
      }
    }

    // ── Build context-aware system prompt ────────────────────────────────
    const now = new Date()
    const hour = now.getHours()
    const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
    const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

    const contextBlock = `

CURRENT CONTEXT:
- Time of day: ${timeOfDay}
- Date: ${dateStr}
- User name: ${userName || 'the user'}
- Tenant/Organisation: ${tenantName || 'PCIS Solutions'}
- This is message ${messages.length} in the conversation.${messages.length === 1 ? ' This is the opening message -- greet the user.' : ''}
- Tenant resolved: ${p1OrgId ? 'yes (live engine data available)' : 'no (engines not reachable)'}${engineIntelligence}`

    const fullSystemPrompt = PA_SYSTEM_PROMPT + contextBlock

    // ── Build conversation for Claude ───────────────────────────────────
    const conversationMessages = messages.map((msg: { role: string; content: string }) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    }))

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('Anthropic API key not configured')
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        temperature: 0.7,
        system: fullSystemPrompt,
        messages: conversationMessages,
      }),
    })

    if (!response.ok) {
      const errBody = await response.text()
      console.error('PA API error:', response.status, errBody)
      throw new Error(`Anthropic API returned ${response.status}`)
    }

    const data = await response.json()
    const rawContent = data.content?.[0]?.text?.trim() || ''

    // Enforce style: no em dashes
    const cleaned = rawContent.replace(/—/g, '--').replace(/–/g, '--')

    // ── Feedback Detection & Forwarding ────────────────────────────────
    const isFeedback = cleaned.includes('[FEEDBACK]')
    const userContent = cleaned.replace(/\[FEEDBACK\]/g, '').trim()

    if (isFeedback) {
      const feedbackMsg = messages
        .filter((m: { role: string }) => m.role === 'user')
        .pop()
      const feedbackText = feedbackMsg?.content || 'No content'
      const feedbackPayload = `[PA Feedback] From: ${userName || 'Unknown'} (${tenantName || 'Unknown tenant'}) | ${new Date().toISOString()}\n\n${feedbackText}`

      try {
        await fetch('https://pcis-command-center.vercel.app/api/franklin/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenant_id: p1OrgId || 'unknown',
            tenant_name: tenantName || 'Unknown',
            source: 'pa-assistant',
            category: 'general',
            priority: 'medium',
            subject: `PA Feedback from ${userName || 'User'}`,
            description: feedbackPayload,
          }),
        })
      } catch (feedbackErr) {
        console.error('Failed to forward feedback:', feedbackErr)
      }
    }

    return NextResponse.json({
      content: userContent,
      tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      isFeedback,
      enginesConsulted: isGreeting ? [] : [...classifyEngines(userQuestion)],
    })
  } catch (error) {
    console.error('PA route error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'PA request failed' },
      { status: 500 }
    )
  }
}
