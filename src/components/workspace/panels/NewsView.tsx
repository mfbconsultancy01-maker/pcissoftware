'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'

// ============================================================================
// NWS — Dubai News Intelligence Panel
// ============================================================================
// Live Dubai real estate & financial news aggregated from public sources.
// PCIS Gold Standard styling — matches CIE/SCOUT dashboard patterns.
// Click any article → GPT-powered narrative slide-out drawer (on-demand).
// ============================================================================

// ── Types ─────────────────────────────────────────────────────────────────

interface NewsArticle {
  id: string
  title: string
  link: string
  source: string
  sourceUrl: string
  publishedAt: string
  description: string
  category: 'real-estate' | 'financial' | 'development' | 'regulatory' | 'market'
}

type CategoryFilter = 'all' | NewsArticle['category']

// ── Constants ─────────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<string, { label: string; color: string; short: string }> = {
  'real-estate':  { label: 'Real Estate',  color: '#22c55e', short: 'RE' },
  'financial':    { label: 'Financial',     color: '#06b6d4', short: 'FIN' },
  'development':  { label: 'Development',   color: '#a78bfa', short: 'DEV' },
  'regulatory':   { label: 'Regulatory',    color: '#f59e0b', short: 'REG' },
  'market':       { label: 'Market',        color: '#ec4899', short: 'MKT' },
}

const FILTER_OPTIONS: { key: CategoryFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'real-estate', label: 'Real Estate' },
  { key: 'financial', label: 'Financial' },
  { key: 'development', label: 'Development' },
  { key: 'regulatory', label: 'Regulatory' },
  { key: 'market', label: 'Market' },
]

// ── Formatting ────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ── PCIS Card Wrappers ────────────────────────────────────────────────────

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

// ── Category Badge ────────────────────────────────────────────────────────

function CategoryBadge({ category }: { category: string }) {
  const config = CATEGORY_CONFIG[category] || { label: category, color: '#9ca3af', short: '?' }
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider"
      style={{ color: config.color, backgroundColor: `${config.color}15`, border: `1px solid ${config.color}25` }}
    >
      {config.short}
    </span>
  )
}

// ── Source Pill ────────────────────────────────────────────────────────────

function SourcePill({ source }: { source: string }) {
  return (
    <span className="text-[8px] text-white/30 font-mono uppercase tracking-wider">
      {source}
    </span>
  )
}

// ── Clean Description ─────────────────────────────────────────────────────

function cleanDescription(text: string): string {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/https?:\/\/[^\s]+/g, '')
    .replace(/href\s*[:=]\s*"[^"]*"/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// ── Article Narrative Drawer ──────────────────────────────────────────────

function ArticleDrawer({
  article,
  onClose,
}: {
  article: NewsArticle
  onClose: () => void
}) {
  const [narrative, setNarrative] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tokens, setTokens] = useState(0)
  const drawerRef = useRef<HTMLDivElement>(null)

  const cat = CATEGORY_CONFIG[article.category] || { label: article.category, color: '#9ca3af', short: '?' }

  // Fetch narrative on mount (only when user clicks)
  useEffect(() => {
    let cancelled = false
    async function fetchNarrative() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch('/api/news/summarize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: article.title,
            description: cleanDescription(article.description),
            source: article.source,
            category: article.category,
          }),
        })
        if (!res.ok) throw new Error('Failed to generate narrative')
        const data = await res.json()
        if (!cancelled) {
          setNarrative(data.narrative)
          setTokens(data.tokens || 0)
        }
      } catch {
        if (!cancelled) setError('Unable to generate narrative')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchNarrative()
    return () => { cancelled = true }
  }, [article])

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    // Delay to avoid immediate close from the click that opened it
    const timer = setTimeout(() => {
      window.addEventListener('mousedown', handleClick)
    }, 100)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('mousedown', handleClick)
    }
  }, [onClose])

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40 transition-opacity" />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="fixed top-0 right-0 h-full w-[420px] bg-[#0a0b0d] border-l border-pcis-border/30 z-50 shadow-2xl overflow-y-auto"
        style={{ animation: 'slideInRight 0.25s ease-out' }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-7 h-7 rounded-lg bg-white/[0.04] border border-pcis-border/20 flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/[0.08] transition-all z-10"
        >
          <span className="text-[13px]">&times;</span>
        </button>

        {/* Category + Time header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-2 mb-4">
            <CategoryBadge category={article.category} />
            <span className="text-[9px] text-white/30 font-mono">{timeAgo(article.publishedAt)}</span>
            <div className="flex-1" />
            <span
              className="text-[8px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{ color: cat.color, backgroundColor: `${cat.color}10` }}
            >
              {cat.label}
            </span>
          </div>

          {/* Title */}
          <h2
            className="text-[16px] font-semibold text-white/95 leading-snug mb-2"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {article.title}
          </h2>

          {/* Source + date */}
          <div className="flex items-center gap-2 mb-1">
            <SourcePill source={article.source} />
            <span className="text-[8px] text-white/20">·</span>
            <span className="text-[8px] text-white/25 font-mono">{formatDate(article.publishedAt)}</span>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-6 border-t border-pcis-border/20" />

        {/* AI Narrative Section */}
        <div className="px-6 py-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/20 flex items-center justify-center">
              <span className="text-[8px] font-bold text-emerald-400">AI</span>
            </div>
            <span className="text-[10px] font-semibold text-white/60 uppercase tracking-wider">Intelligence Narrative</span>
            {tokens > 0 && (
              <span className="text-[7px] text-white/15 font-mono ml-auto">{tokens} tokens</span>
            )}
          </div>

          {loading && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-white/40">Generating narrative...</span>
              </div>
              {/* Skeleton lines */}
              <div className="space-y-2">
                <div className="h-2.5 bg-white/[0.04] rounded-full w-full animate-pulse" />
                <div className="h-2.5 bg-white/[0.04] rounded-full w-[90%] animate-pulse" style={{ animationDelay: '0.1s' }} />
                <div className="h-2.5 bg-white/[0.04] rounded-full w-[95%] animate-pulse" style={{ animationDelay: '0.2s' }} />
                <div className="h-2.5 bg-white/[0.04] rounded-full w-[70%] animate-pulse" style={{ animationDelay: '0.3s' }} />
              </div>
            </div>
          )}

          {error && (
            <div className="px-3 py-2.5 rounded-lg bg-red-500/5 border border-red-500/15">
              <p className="text-[10px] text-red-400/80">{error}</p>
              <p className="text-[9px] text-white/25 mt-1">The article is still accessible via the link below.</p>
            </div>
          )}

          {narrative && (
            <div className="space-y-3">
              <div className="pl-3 border-l-2 border-emerald-500/30">
                <p className="text-[12px] text-white/75 leading-relaxed">
                  {narrative}
                </p>
              </div>
              <div className="flex items-center gap-1.5 pt-1">
                <div className="w-1 h-1 rounded-full bg-emerald-500/40" />
                <span className="text-[7px] text-white/20 font-mono uppercase tracking-wider">
                  Generated by GPT-4o-mini · PCIS Intelligence
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="mx-6 border-t border-pcis-border/20" />

        {/* Original description */}
        {article.description && (
          <div className="px-6 py-4">
            <span className="text-[9px] font-semibold text-white/30 uppercase tracking-wider block mb-2">Original Excerpt</span>
            <p className="text-[10px] text-white/35 leading-relaxed">
              {cleanDescription(article.description).slice(0, 300)}
              {cleanDescription(article.description).length > 300 ? '...' : ''}
            </p>
          </div>
        )}

        {/* Divider */}
        <div className="mx-6 border-t border-pcis-border/20" />

        {/* Action buttons */}
        <div className="px-6 py-5 space-y-3">
          <a
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg text-[11px] font-semibold transition-all"
            style={{
              backgroundColor: `${cat.color}15`,
              border: `1px solid ${cat.color}30`,
              color: cat.color,
            }}
          >
            Read Full Article
            <span className="text-[10px]">&rarr;</span>
          </a>

          <button
            onClick={onClose}
            className="w-full px-4 py-2 rounded-lg text-[10px] text-white/30 hover:text-white/50 bg-white/[0.02] border border-pcis-border/15 hover:border-pcis-border/30 transition-all font-mono uppercase tracking-wider"
          >
            Close
          </button>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <div className="text-center">
            <span className="text-[7px] text-white/10 font-mono tracking-widest uppercase">
              NWS · Article Intelligence · PCIS E2
            </span>
          </div>
        </div>
      </div>

      {/* Animation keyframe */}
      <style jsx>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </>
  )
}

// ── News Card ─────────────────────────────────────────────────────────────

function NewsCard({
  article,
  layout,
  onSelect,
}: {
  article: NewsArticle
  layout: 'featured' | 'compact' | 'list'
  onSelect: (article: NewsArticle) => void
}) {
  const cat = CATEGORY_CONFIG[article.category] || { label: article.category, color: '#9ca3af', short: '?' }

  if (layout === 'featured') {
    return (
      <div
        onClick={() => onSelect(article)}
        className="block group cursor-pointer"
      >
        <Panel className="hover:border-pcis-gold/30 transition-all">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <CategoryBadge category={article.category} />
              <span className="text-[9px] text-white/30 font-mono">{timeAgo(article.publishedAt)}</span>
            </div>
            <h3
              className="text-[13px] font-semibold text-white/90 leading-snug mb-2 group-hover:text-pcis-gold transition-colors line-clamp-2"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {article.title}
            </h3>
            <p className="text-[10px] text-white/40 leading-relaxed mb-3 line-clamp-3">
              {cleanDescription(article.description) || article.source}
            </p>
            <div className="flex items-center justify-between">
              <SourcePill source={article.source} />
              <div className="flex items-center gap-1">
                <div className="w-1 h-1 rounded-full" style={{ backgroundColor: cat.color, opacity: 0.5 }} />
                <span className="text-[8px] text-white/20 group-hover:text-pcis-gold/50 transition-colors">Analyse &rarr;</span>
              </div>
            </div>
          </div>
        </Panel>
      </div>
    )
  }

  if (layout === 'compact') {
    return (
      <div
        onClick={() => onSelect(article)}
        className="block group cursor-pointer"
      >
        <div className="px-4 py-3 border-b border-pcis-border/10 hover:bg-white/[0.02] transition-colors">
          <div className="flex items-start gap-3">
            <div
              className="w-1 h-full min-h-[32px] rounded-full mt-0.5 shrink-0"
              style={{ backgroundColor: cat.color, opacity: 0.5 }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <CategoryBadge category={article.category} />
                <span className="text-[8px] text-white/25 font-mono">{timeAgo(article.publishedAt)}</span>
              </div>
              <h4 className="text-[11px] font-semibold text-white/80 leading-snug group-hover:text-pcis-gold transition-colors line-clamp-2">
                {article.title}
              </h4>
              <div className="flex items-center justify-between mt-1.5">
                <SourcePill source={article.source} />
                <span className="text-[8px] text-white/15 group-hover:text-pcis-gold/40 transition-colors">&rarr;</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // list layout
  return (
    <div
      onClick={() => onSelect(article)}
      className="block group cursor-pointer"
    >
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-pcis-border/10 hover:bg-white/[0.02] transition-colors">
        <div className="w-1 h-4 rounded-full shrink-0" style={{ backgroundColor: cat.color, opacity: 0.5 }} />
        <span className="text-[10px] text-white/70 group-hover:text-pcis-gold transition-colors flex-1 truncate">
          {article.title}
        </span>
        <span className="text-[8px] text-white/25 font-mono shrink-0">{timeAgo(article.publishedAt)}</span>
        <SourcePill source={article.source} />
      </div>
    </div>
  )
}

// ── Stats Bar ─────────────────────────────────────────────────────────────

function NewsStatsBar({ articles }: { articles: NewsArticle[] }) {
  const counts = useMemo(() => {
    const c: Record<string, number> = { total: articles.length }
    articles.forEach((a) => { c[a.category] = (c[a.category] || 0) + 1 })
    return c
  }, [articles])

  const latest = articles[0]
  const uniqueSources = useMemo(() => new Set(articles.map((a) => a.source)).size, [articles])

  const stats = [
    { label: 'Articles', value: `${counts.total}`, color: '#22c55e' },
    { label: 'Sources', value: `${uniqueSources}`, color: '#06b6d4' },
    { label: 'Real Estate', value: `${counts['real-estate'] || 0}`, color: CATEGORY_CONFIG['real-estate'].color },
    { label: 'Financial', value: `${counts['financial'] || 0}`, color: CATEGORY_CONFIG['financial'].color },
    { label: 'Development', value: `${counts['development'] || 0}`, color: CATEGORY_CONFIG['development'].color },
    { label: 'Regulatory', value: `${counts['regulatory'] || 0}`, color: CATEGORY_CONFIG['regulatory'].color },
    { label: 'Latest', value: latest ? timeAgo(latest.publishedAt) : '—', color: '#d4a574' },
  ]

  return (
    <div className="flex items-center gap-5 text-[10px] flex-wrap">
      {stats.map((s, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="text-pcis-text-muted">{s.label}:</span>
          <span className="font-mono font-bold" style={{ color: s.color }}>{s.value}</span>
        </div>
      ))}
    </div>
  )
}

// ── Category Distribution ─────────────────────────────────────────────────

function CategoryDistribution({ articles }: { articles: NewsArticle[] }) {
  const data = useMemo(() => {
    const counts: Record<string, number> = {}
    articles.forEach((a) => { counts[a.category] = (counts[a.category] || 0) + 1 })
    return Object.entries(counts)
      .map(([cat, count]) => ({
        category: cat,
        count,
        pct: Math.round((count / articles.length) * 100),
        ...(CATEGORY_CONFIG[cat] || { label: cat, color: '#9ca3af', short: '?' }),
      }))
      .sort((a, b) => b.count - a.count)
  }, [articles])

  return (
    <Panel>
      <PanelHeader title="Category Distribution" accent="#a78bfa" />
      <div className="p-4 space-y-2.5">
        {data.map((d) => (
          <div key={d.category} className="flex items-center gap-3">
            <span className="text-[9px] font-mono font-bold w-6 shrink-0" style={{ color: d.color }}>{d.short}</span>
            <div className="flex-1 h-2 bg-white/[0.04] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${d.pct}%`, backgroundColor: d.color, opacity: 0.7 }}
              />
            </div>
            <span className="text-[9px] font-mono text-white/50 w-6 text-right">{d.count}</span>
          </div>
        ))}
      </div>
    </Panel>
  )
}

// ── Top Sources ───────────────────────────────────────────────────────────

function TopSources({ articles }: { articles: NewsArticle[] }) {
  const sources = useMemo(() => {
    const counts: Record<string, number> = {}
    articles.forEach((a) => { counts[a.source] = (counts[a.source] || 0) + 1 })
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
  }, [articles])

  return (
    <Panel>
      <PanelHeader title="Top Sources" accent="#06b6d4" />
      <div className="p-4 space-y-2">
        {sources.map(([name, count], i) => (
          <div key={name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-mono text-white/25 w-3">{i + 1}</span>
              <span className="text-[10px] text-white/60 truncate max-w-[160px]">{name}</span>
            </div>
            <span className="text-[9px] font-mono font-bold text-cyan-400">{count}</span>
          </div>
        ))}
      </div>
    </Panel>
  )
}

// ── Timeline Heatmap ──────────────────────────────────────────────────────

function TimelineHeatmap({ articles }: { articles: NewsArticle[] }) {
  const hourData = useMemo(() => {
    const hours = new Array(24).fill(0)
    articles.forEach((a) => {
      const h = new Date(a.publishedAt).getHours()
      hours[h]++
    })
    const max = Math.max(...hours, 1)
    return hours.map((count, hour) => ({
      hour,
      count,
      intensity: count / max,
    }))
  }, [articles])

  return (
    <Panel>
      <PanelHeader title="Publication Timeline" accent="#d4a574" />
      <div className="p-4">
        <div className="flex items-end gap-[3px] h-16">
          {hourData.map((d) => (
            <div
              key={d.hour}
              className="flex-1 rounded-t-sm transition-all"
              style={{
                height: `${Math.max(d.intensity * 100, 4)}%`,
                backgroundColor: d.intensity > 0.6 ? '#22c55e' : d.intensity > 0.3 ? '#06b6d4' : 'rgba(255,255,255,0.08)',
                opacity: d.intensity > 0 ? 0.4 + d.intensity * 0.6 : 0.2,
              }}
              title={`${d.hour}:00 — ${d.count} articles`}
            />
          ))}
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[7px] text-white/20 font-mono">00:00</span>
          <span className="text-[7px] text-white/20 font-mono">06:00</span>
          <span className="text-[7px] text-white/20 font-mono">12:00</span>
          <span className="text-[7px] text-white/20 font-mono">18:00</span>
          <span className="text-[7px] text-white/20 font-mono">23:00</span>
        </div>
      </div>
    </Panel>
  )
}


// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT — NewsView
// ═══════════════════════════════════════════════════════════════════════════

export default function NewsView() {
  const [articles, setArticles] = useState<NewsArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<CategoryFilter>('all')
  const [cachedAt, setCachedAt] = useState<string | null>(null)
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null)

  // ── Fetch news ──────────────────────────────────────────────────────────

  const fetchNews = useCallback(async (bustCache = false) => {
    try {
      setLoading(true)
      setError(null)
      const url = bustCache ? '/api/news?limit=80&refresh=true' : '/api/news?limit=80'
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setArticles(data.articles || [])
      setCachedAt(data.cachedAt)
    } catch {
      setError('Unable to load news. Retrying...')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNews()
    // Auto-refresh every 5 minutes with cache-busting
    const interval = setInterval(() => fetchNews(true), 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchNews])

  // ── Filtered articles ───────────────────────────────────────────────────

  const filtered = useMemo(() => {
    if (filter === 'all') return articles
    return articles.filter((a) => a.category === filter)
  }, [articles, filter])

  const featured = filtered.slice(0, 3)
  const rest = filtered.slice(3)

  // ── Loading state ───────────────────────────────────────────────────────

  if (loading && articles.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center animate-pulse">
            <span className="text-lg font-mono font-bold text-green-400">NWS</span>
          </div>
          <p className="text-[11px] text-white/40">Loading Dubai news intelligence...</p>
        </div>
      </div>
    )
  }

  // ── Error state ─────────────────────────────────────────────────────────

  if (error && articles.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-3 max-w-md">
          <div className="w-12 h-12 mx-auto rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <span className="text-lg font-mono font-bold text-red-400">!</span>
          </div>
          <p className="text-[11px] text-white/50">{error}</p>
          <button
            onClick={() => fetchNews(true)}
            className="text-[10px] text-pcis-gold hover:text-pcis-gold/80 font-mono uppercase tracking-wider"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">

      {/* ── Article Drawer (on-demand GPT narrative) ──────────────────── */}
      {selectedArticle && (
        <ArticleDrawer
          article={selectedArticle}
          onClose={() => setSelectedArticle(null)}
        />
      )}

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1
            className="text-[15px] font-semibold text-white/90"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Dubai News Intelligence
          </h1>
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-500/10 border border-green-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[8px] font-mono text-green-400 uppercase">Live</span>
          </div>
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/15 ml-1">
            <span className="text-[7px] font-mono text-emerald-400/70 uppercase">AI Narratives</span>
          </div>
        </div>
        <p className="text-[10px] text-pcis-text-muted">
          E2 · REAL ESTATE · FINANCIAL · DEVELOPMENT · REGULATORY · Click any article for AI analysis
        </p>
      </div>

      {/* ── Stats Bar ───────────────────────────────────────────────────── */}
      <Panel>
        <div className="px-4 py-2.5">
          <NewsStatsBar articles={articles} />
        </div>
      </Panel>

      {/* ── Filter Bar ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5">
        {FILTER_OPTIONS.map((opt) => {
          const isActive = filter === opt.key
          const catColor = opt.key !== 'all' ? CATEGORY_CONFIG[opt.key]?.color : '#d4a574'
          return (
            <button
              key={opt.key}
              onClick={() => setFilter(opt.key)}
              className={`px-2.5 py-1 rounded-lg text-[9px] font-mono uppercase tracking-wider transition-all ${
                isActive
                  ? 'text-white font-bold'
                  : 'text-white/30 hover:text-white/50'
              }`}
              style={isActive ? {
                backgroundColor: `${catColor}15`,
                border: `1px solid ${catColor}30`,
                color: catColor,
              } : {
                border: '1px solid transparent',
              }}
            >
              {opt.label}
            </button>
          )
        })}
        <div className="flex-1" />
        {cachedAt && (
          <span className="text-[8px] text-white/20 font-mono">
            Updated {timeAgo(cachedAt)}
          </span>
        )}
        <button
          onClick={() => fetchNews(true)}
          className="text-[8px] text-pcis-gold/50 hover:text-pcis-gold font-mono uppercase tracking-wider transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* ── Featured Articles (Top 3) ───────────────────────────────────── */}
      {featured.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {featured.map((article) => (
            <NewsCard key={article.id} article={article} layout="featured" onSelect={setSelectedArticle} />
          ))}
        </div>
      )}

      {/* ── Main Content Grid ───────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3">

        {/* Feed — spans 3 columns */}
        <div className="col-span-3">
          <Panel>
            <PanelHeader
              title="News Feed"
              accent="#22c55e"
              right={
                <span className="text-[9px] text-white/30 font-mono">
                  {filtered.length} articles
                </span>
              }
            />
            <div className="max-h-[600px] overflow-y-auto">
              {rest.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-[10px] text-white/30">No articles in this category</p>
                </div>
              ) : (
                rest.map((article) => (
                  <NewsCard key={article.id} article={article} layout="compact" onSelect={setSelectedArticle} />
                ))
              )}
            </div>
          </Panel>
        </div>

        {/* Sidebar — 1 column */}
        <div className="space-y-3">
          <CategoryDistribution articles={articles} />
          <TopSources articles={articles} />
          <TimelineHeatmap articles={articles} />
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <div className="text-center pt-2 pb-4">
        <span className="text-[8px] text-white/15 font-mono tracking-widest uppercase">
          NWS · Dubai News Intelligence · PCIS Engine 2 · SCOUT
        </span>
      </div>
    </div>
  )
}
