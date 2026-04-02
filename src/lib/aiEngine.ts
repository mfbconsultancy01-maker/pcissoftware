// ============================================================================
// PCIS AI ENGINE -- Shared LLM Utility Layer
// ============================================================================
// Centralised LLM call wrapper for all ENGINE and FORGE AI endpoints.
// ENGINE uses OpenAI (gpt-4o-mini). FORGE uses Anthropic Claude.
// Both enforce PCIS style rules (no em dashes, professional tone, etc.)
// ============================================================================

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

// PCIS style enforcement -- appended to every system prompt
const PCIS_STYLE_RULES = `

CRITICAL STYLE RULES -- follow these exactly:
- NEVER use em dashes anywhere. Use double hyphens (--) instead.
- Write in flowing professional prose. No bullet points unless explicitly requested.
- Be specific with numbers -- cite exact scores, percentages, and data points.
- Reference PCIS engines by name: CIE (Client Intelligence Engine), SCOUT (Market Intelligence), ENGINE (Match Scoring), FORGE (Action Layer).
- Use British English spelling (analyse, behaviour, programme, favour).
- Keep paragraphs focused -- each paragraph should make one clear point.
- Do not use placeholder language like "various factors" or "multiple reasons" -- be specific about which factors and which reasons.
- Do not use the word "delve" or "leverage" or "utilize" -- use simpler alternatives.
- Company name is "PCIS Solutions" not "PCIS" alone when referencing the company.
- Currency is AED (United Arab Emirates Dirham) -- always include "AED" before amounts.
- Never start sentences with "It is worth noting" or "It should be noted" -- just state the point.`

export interface AICallOptions {
  systemPrompt: string
  userMessage: string
  model?: string
  maxTokens?: number
  temperature?: number
}

export interface AIResponse {
  content: string
  model: string
  tokens: number
}

// ── OpenAI (used by ENGINE) ───────────────────────────────────────────────

export async function callAI(options: AICallOptions): Promise<AIResponse> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OpenAI API key not configured')
  }

  const {
    systemPrompt,
    userMessage,
    model = 'gpt-4o-mini',
    maxTokens = 800,
    temperature = 0.7,
  } = options

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt + PCIS_STYLE_RULES },
        { role: 'user', content: userMessage },
      ],
      max_tokens: maxTokens,
      temperature,
    }),
  })

  if (!response.ok) {
    const errBody = await response.text()
    console.error('OpenAI API error:', response.status, errBody)
    throw new Error(`OpenAI API returned ${response.status}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content?.trim() || ''

  // Post-process: enforce no em dashes even if the model slips
  const cleaned = content.replace(/—/g, '--').replace(/–/g, '--')

  return {
    content: cleaned,
    model: data.model || model,
    tokens: data.usage?.total_tokens || 0,
  }
}

// ── Anthropic Claude (used by FORGE) ──────────────────────────────────────

export async function callClaude(options: AICallOptions): Promise<AIResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('Anthropic API key not configured')
  }

  const {
    systemPrompt,
    userMessage,
    model = 'claude-sonnet-4-20250514',
    maxTokens = 1500,
    temperature = 0.7,
  } = options

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt + PCIS_STYLE_RULES,
      messages: [
        { role: 'user', content: userMessage },
      ],
    }),
  })

  if (!response.ok) {
    const errBody = await response.text()
    console.error('Anthropic API error:', response.status, errBody)
    throw new Error(`Anthropic API returned ${response.status}`)
  }

  const data = await response.json()
  const content = data.content?.[0]?.text?.trim() || ''

  // Post-process: enforce no em dashes even if Claude slips
  const cleaned = content.replace(/—/g, '--').replace(/–/g, '--')

  return {
    content: cleaned,
    model: data.model || model,
    tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
  }
}
