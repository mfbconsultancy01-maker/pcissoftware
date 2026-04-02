import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

// ============================================================================
// PCIS News API — Dubai Real Estate & Financial News Aggregator
// ============================================================================
// Fetches live news from verified Dubai RSS feeds + Atom feeds, parses XML,
// and returns structured JSON for the NWS workspace panel.
// Caches for 15 minutes. All feeds are verified to work from Vercel serverless.
// ============================================================================

export interface NewsArticle {
  id: string
  title: string
  link: string
  source: string
  sourceUrl: string
  publishedAt: string
  description: string
  category: 'real-estate' | 'financial' | 'development' | 'regulatory' | 'market'
}

// ── Verified Working RSS/Atom Feeds ───────────────────────────────────────
// These feeds are confirmed to return valid data from Vercel serverless.
const FEEDS = [
  // Dubai-specific real estate news
  {
    url: 'https://propertynews.ae/feed/',
    source: 'Property News AE',
    category: 'real-estate' as const,
    format: 'rss' as const,
  },
  // Dubai business & financial chronicle
  {
    url: 'https://www.dubaichronicle.com/feed/',
    source: 'Dubai Chronicle',
    category: 'financial' as const,
    format: 'rss' as const,
  },
  // Global property journal (Atom feed) — strong Dubai coverage
  {
    url: 'https://www.worldpropertyjournal.com/feed.xml',
    source: 'World Property Journal',
    category: 'market' as const,
    format: 'atom' as const,
  },
  // Dubai PR Network — development launches & press releases
  {
    url: 'https://www.dubaiprnetwork.com/rss_feed.asp',
    source: 'Dubai PR Network',
    category: 'development' as const,
    format: 'rss' as const,
  },
]

// ── XML Parsing Utilities ─────────────────────────────────────────────────

function extractTag(xml: string, tag: string): string {
  // Match CDATA-wrapped content first, then plain tags
  const regex = new RegExp(
    `<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>|<${tag}[^>]*>([\\s\\S]*?)</${tag}>`
  )
  const match = xml.match(regex)
  if (!match) return ''
  const raw = match[1] || match[2] || ''
  return raw
    .replace(/<[^>]+>/g, '')
    .replace(/https?:\/\/[^\s]+/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function extractLink(xml: string): string {
  // For RSS: <link>url</link>
  const rssMatch = xml.match(/<link>([^<]+)<\/link>/)
  if (rssMatch) return rssMatch[1].trim()
  // For Atom: <link href="url" ... />
  const atomMatch = xml.match(/<link[^>]+href="([^"]+)"/)
  if (atomMatch) return atomMatch[1].trim()
  return ''
}

// ── RSS Parser ────────────────────────────────────────────────────────────

function parseRSSItems(xml: string, sourceName: string, category: NewsArticle['category']): NewsArticle[] {
  const items: NewsArticle[] = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  let match

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1]
    const title = extractTag(itemXml, 'title')
    const link = extractLink(itemXml)
    const pubDate = extractTag(itemXml, 'pubDate')
    const description = extractTag(itemXml, 'description')

    // Try to extract <dc:creator> or <source> for per-article source
    const creatorMatch = itemXml.match(/<dc:creator>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/dc:creator>/)
    const sourceMatch = itemXml.match(/<source[^>]*>([^<]+)<\/source>/)
    const articleSource = creatorMatch?.[1]?.trim() || sourceMatch?.[1]?.trim() || sourceName

    if (title && link) {
      items.push({
        id: Buffer.from(link).toString('base64').slice(0, 24),
        title,
        link,
        source: articleSource,
        sourceUrl: '',
        publishedAt: pubDate || new Date().toISOString(),
        description: description.slice(0, 300),
        category,
      })
    }
  }

  return items
}

// ── Atom Parser ───────────────────────────────────────────────────────────

function parseAtomItems(xml: string, sourceName: string, category: NewsArticle['category']): NewsArticle[] {
  const items: NewsArticle[] = []
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g
  let match

  while ((match = entryRegex.exec(xml)) !== null) {
    const entryXml = match[1]
    const title = extractTag(entryXml, 'title')
    const link = extractLink(entryXml)
    const published = extractTag(entryXml, 'published') || extractTag(entryXml, 'updated')
    const summary = extractTag(entryXml, 'summary') || extractTag(entryXml, 'content')

    if (title && link) {
      items.push({
        id: Buffer.from(link).toString('base64').slice(0, 24),
        title,
        link,
        source: sourceName,
        sourceUrl: '',
        publishedAt: published || new Date().toISOString(),
        description: summary.slice(0, 300),
        category,
      })
    }
  }

  return items
}

// ── Category Refinement ───────────────────────────────────────────────────

function refineCategory(article: NewsArticle): NewsArticle {
  const t = article.title.toLowerCase()
  if (/rera|dld|regulat|law|policy|mandate|compliance|government|decree/.test(t)) {
    return { ...article, category: 'regulatory' }
  }
  if (/gdp|inflation|interest rate|central bank|currency|dirham|bond|stock|fund|invest|economy|banking/.test(t)) {
    return { ...article, category: 'financial' }
  }
  if (/launch|develop|off.?plan|project|tower|community|handover|construction|master.?plan/.test(t)) {
    return { ...article, category: 'development' }
  }
  if (/price|villa|apartment|transaction|rent|sale|sqft|buyer|mortgage|freehold|landlord|tenant/.test(t)) {
    return { ...article, category: 'real-estate' }
  }
  if (/market|trend|demand|supply|growth|forecast|outlook|sector|record/.test(t)) {
    return { ...article, category: 'market' }
  }
  return article
}

// ── Dubai Relevance Filter ────────────────────────────────────────────────

function isDubaiRelevant(article: NewsArticle): boolean {
  const text = `${article.title} ${article.description}`.toLowerCase()
  // Always include if from Dubai-specific sources
  if (article.source === 'Property News AE' || article.source === 'Dubai Chronicle' || article.source === 'Dubai PR Network') {
    return true
  }
  // For global feeds, filter to Dubai/UAE/Gulf relevant content
  return /dubai|abu dhabi|uae|emirates|gulf|middle east|gcc|sharjah|ajman|ras al|fujairah/.test(text)
}

// ── Google News via rss2json proxy ────────────────────────────────────────
// Google News RSS blocks direct server-side fetches from Vercel, but the
// rss2json.com proxy converts them to JSON reliably. These are supplementary
// feeds that provide more frequent/fresh articles.
const GOOGLE_NEWS_FEEDS = [
  {
    query: 'dubai+real+estate+property',
    category: 'real-estate' as const,
  },
  {
    query: 'dubai+economy+finance+investment',
    category: 'financial' as const,
  },
  {
    query: 'dubai+property+development+off-plan',
    category: 'development' as const,
  },
]

interface Rss2JsonItem {
  title?: string
  link?: string
  pubDate?: string
  description?: string
  author?: string
}

async function fetchGoogleNews(query: string, category: NewsArticle['category']): Promise<NewsArticle[]> {
  const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=en&gl=AE&ceid=AE:en`

  // Strategy 1: Try rss2json proxy
  try {
    const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}&count=20`
    const res = await fetch(proxyUrl, { next: { revalidate: 900 } })
    if (res.ok) {
      const data = await res.json()
      if (data.status === 'ok' && data.items?.length > 0) {
        return data.items
          .filter((item: Rss2JsonItem) => item.title && item.link)
          .map((item: Rss2JsonItem) => ({
            id: Buffer.from(item.link || '').toString('base64').slice(0, 24),
            title: (item.title || '').replace(/<[^>]+>/g, '').trim(),
            link: item.link || '',
            source: (item.author || 'Google News').replace(/<[^>]+>/g, '').trim(),
            sourceUrl: '',
            publishedAt: item.pubDate || new Date().toISOString(),
            description: (item.description || '')
              .replace(/<[^>]+>/g, '')
              .replace(/https?:\/\/[^\s]+/g, '')
              .replace(/\s+/g, ' ')
              .trim()
              .slice(0, 300),
            category,
          }))
      }
    }
  } catch {
    // Proxy failed, try direct
  }

  // Strategy 2: Direct Google News RSS fetch
  try {
    const res = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
      next: { revalidate: 900 },
    })
    if (res.ok) {
      const xml = await res.text()
      if (xml.includes('<item>')) {
        return parseRSSItems(xml, 'Google News', category)
      }
    }
  } catch {
    // Direct fetch also failed
  }

  return []
}

// ── In-memory cache ───────────────────────────────────────────────────────
let cache: { articles: NewsArticle[]; timestamp: number } | null = null
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

async function fetchAllNews(): Promise<NewsArticle[]> {
  // Return cache if fresh
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return cache.articles
  }

  const results: NewsArticle[] = []

  // Fetch all sources in parallel: direct feeds + Google News proxy
  await Promise.allSettled([
    // Direct RSS/Atom feeds
    ...FEEDS.map(async (feed) => {
      try {
        const res = await fetch(feed.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; PCIS/1.0; +https://pcis-p1-dashboard.vercel.app)',
            'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
          },
          next: { revalidate: 900 },
        })
        if (!res.ok) return

        const xml = await res.text()

        let items: NewsArticle[]
        if (feed.format === 'atom') {
          items = parseAtomItems(xml, feed.source, feed.category)
        } else {
          items = parseRSSItems(xml, feed.source, feed.category)
        }

        results.push(...items)
      } catch {
        // Silently skip failed feeds
      }
    }),
    // Google News (supplementary — fresher articles via proxy or direct)
    ...GOOGLE_NEWS_FEEDS.map(async (gFeed) => {
      const items = await fetchGoogleNews(gFeed.query, gFeed.category)
      results.push(...items)
    }),
  ])

  // Deduplicate by title similarity
  const seen = new Set<string>()
  const unique = results.filter((a) => {
    const key = a.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 60)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // Refine categories, filter relevance, and sort by date
  const refined = unique
    .map(refineCategory)
    .filter(isDubaiRelevant)
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())

  cache = { articles: refined, timestamp: Date.now() }
  return refined
}

// ── API Handler ───────────────────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const refresh = searchParams.get('refresh') === 'true'

    // Force-refresh clears the cache
    if (refresh) {
      cache = null
    }

    let articles = await fetchAllNews()

    if (category && category !== 'all') {
      articles = articles.filter((a) => a.category === category)
    }

    articles = articles.slice(0, limit)

    return NextResponse.json({
      articles,
      total: articles.length,
      feedCount: FEEDS.length + GOOGLE_NEWS_FEEDS.length,
      cachedAt: cache?.timestamp ? new Date(cache.timestamp).toISOString() : null,
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch news', articles: [], total: 0, feedCount: 0 },
      { status: 500 }
    )
  }
}
