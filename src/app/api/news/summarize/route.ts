import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

// ============================================================================
// NWS — AI Article Narrative Generator
// ============================================================================
// On-demand GPT-4o-mini narrative for a clicked news article.
// Only called when a user clicks an article — saves tokens.
// ============================================================================

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

const SYSTEM_PROMPT = `You are a Dubai real estate and financial news analyst for PCIS (Property & Capital Intelligence System).
When given a news article's title, source, and description, write a brief, insightful narrative (3-5 sentences) that:
1. Summarizes the key facts
2. Explains why this matters for Dubai's property/investment market
3. Notes any implications for investors or market participants

Keep it professional but accessible. Use specific numbers if available.
Do NOT use bullet points — write in flowing prose.
If the article isn't directly about Dubai real estate/finance, relate it to the Dubai market context where possible.`

interface SummarizeRequest {
  title: string
  description: string
  source: string
  category: string
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    const body: SummarizeRequest = await request.json()
    const { title, description, source, category } = body

    if (!title) {
      return NextResponse.json(
        { error: 'Article title is required' },
        { status: 400 }
      )
    }

    const userMessage = `Article Title: ${title}
Source: ${source || 'Unknown'}
Category: ${category || 'general'}
Description: ${description || 'No description available'}

Write a brief narrative about this article.`

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const errBody = await response.text()
      console.error('OpenAI API error:', response.status, errBody)
      return NextResponse.json(
        { error: 'Failed to generate narrative' },
        { status: 502 }
      )
    }

    const data = await response.json()
    const narrative = data.choices?.[0]?.message?.content?.trim() || ''

    return NextResponse.json({
      narrative,
      model: 'gpt-4o-mini',
      tokens: data.usage?.total_tokens || 0,
    })
  } catch (err) {
    console.error('Summarize error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
