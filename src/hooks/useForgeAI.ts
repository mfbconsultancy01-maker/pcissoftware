'use client'

import { useState, useCallback, useRef } from 'react'

// ============================================================================
// FORGE AI Hooks -- Client-side interface for Claude-powered FORGE panels
// ============================================================================
// Same pattern as useEngineAI but hitting FORGE endpoints (Claude-powered).
// Each hook provides: content, loading, error, tokens, cached, generate, reset
// ============================================================================

interface AIState {
  content: string | null
  loading: boolean
  error: string | null
  tokens: number
  cached: boolean
}

const initialState: AIState = {
  content: null,
  loading: false,
  error: null,
  tokens: 0,
  cached: false,
}

// Shared cache across all FORGE hooks
const forgeCache = new Map<string, { content: string; tokens: number; timestamp: number }>()
const CACHE_TTL = 15 * 60 * 1000 // 15 minutes (longer than ENGINE -- FORGE briefs are more expensive)

function getCached(key: string): { content: string; tokens: number } | null {
  const entry = forgeCache.get(key)
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return { content: entry.content, tokens: entry.tokens }
  }
  if (entry) forgeCache.delete(key)
  return null
}

function setCache(key: string, content: string, tokens: number) {
  forgeCache.set(key, { content, tokens, timestamp: Date.now() })
  if (forgeCache.size > 30) {
    const oldest = forgeCache.keys().next().value
    if (oldest) forgeCache.delete(oldest)
  }
}

// ── Deal Brief Hook ───────────────────────────────────────────────────────

export function useDealBrief() {
  const [state, setState] = useState<AIState>(initialState)
  const abortRef = useRef<AbortController | null>(null)

  const generate = useCallback(async (payload: Record<string, any>) => {
    const cacheKey = `deal-${payload.matchId}`
    const cached = getCached(cacheKey)
    if (cached) {
      setState({ content: cached.content, loading: false, error: null, tokens: cached.tokens, cached: true })
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setState({ ...initialState, loading: true })

    try {
      const res = await fetch('/api/forge/deal-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }))
        setState({ content: null, loading: false, error: err.error || `HTTP ${res.status}`, tokens: 0, cached: false })
        return
      }

      const data = await res.json()
      setCache(cacheKey, data.brief, data.tokens)
      setState({ content: data.brief, loading: false, error: null, tokens: data.tokens, cached: false })
    } catch (err: any) {
      if (err.name === 'AbortError') return
      setState({ content: null, loading: false, error: err.message, tokens: 0, cached: false })
    }
  }, [])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setState(initialState)
  }, [])

  return { ...state, generate, reset }
}

// ── Meeting Prep Hook ─────────────────────────────────────────────────────

export function useMeetingPrep() {
  const [state, setState] = useState<AIState>(initialState)
  const abortRef = useRef<AbortController | null>(null)

  const generate = useCallback(async (payload: Record<string, any>) => {
    const cacheKey = `meeting-${payload.clientName}-${payload.meetingType || 'general'}`
    const cached = getCached(cacheKey)
    if (cached) {
      setState({ content: cached.content, loading: false, error: null, tokens: cached.tokens, cached: true })
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setState({ ...initialState, loading: true })

    try {
      const res = await fetch('/api/forge/meeting-prep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }))
        setState({ content: null, loading: false, error: err.error || `HTTP ${res.status}`, tokens: 0, cached: false })
        return
      }

      const data = await res.json()
      setCache(cacheKey, data.brief, data.tokens)
      setState({ content: data.brief, loading: false, error: null, tokens: data.tokens, cached: false })
    } catch (err: any) {
      if (err.name === 'AbortError') return
      setState({ content: null, loading: false, error: err.message, tokens: 0, cached: false })
    }
  }, [])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setState(initialState)
  }, [])

  return { ...state, generate, reset }
}

// ── Opportunity Scan Hook ─────────────────────────────────────────────────

export function useOpportunityScan() {
  const [state, setState] = useState<AIState>(initialState)
  const abortRef = useRef<AbortController | null>(null)

  const generate = useCallback(async (payload: Record<string, any>) => {
    const cacheKey = `opp-${payload.clientName}`
    const cached = getCached(cacheKey)
    if (cached) {
      setState({ content: cached.content, loading: false, error: null, tokens: cached.tokens, cached: true })
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setState({ ...initialState, loading: true })

    try {
      const res = await fetch('/api/forge/opportunity-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }))
        setState({ content: null, loading: false, error: err.error || `HTTP ${res.status}`, tokens: 0, cached: false })
        return
      }

      const data = await res.json()
      setCache(cacheKey, data.scan, data.tokens)
      setState({ content: data.scan, loading: false, error: null, tokens: data.tokens, cached: false })
    } catch (err: any) {
      if (err.name === 'AbortError') return
      setState({ content: null, loading: false, error: err.message, tokens: 0, cached: false })
    }
  }, [])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setState(initialState)
  }, [])

  return { ...state, generate, reset }
}

// ── Comm Draft Hook ───────────────────────────────────────────────────────

export function useCommDraft() {
  const [state, setState] = useState<AIState>(initialState)
  const abortRef = useRef<AbortController | null>(null)

  const generate = useCallback(async (payload: Record<string, any>) => {
    const cacheKey = `comm-${payload.clientName}-${payload.channel}-${payload.commPurpose}`
    const cached = getCached(cacheKey)
    if (cached) {
      setState({ content: cached.content, loading: false, error: null, tokens: cached.tokens, cached: true })
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setState({ ...initialState, loading: true })

    try {
      const res = await fetch('/api/forge/comm-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }))
        setState({ content: null, loading: false, error: err.error || `HTTP ${res.status}`, tokens: 0, cached: false })
        return
      }

      const data = await res.json()
      setCache(cacheKey, data.draft, data.tokens)
      setState({ content: data.draft, loading: false, error: null, tokens: data.tokens, cached: false })
    } catch (err: any) {
      if (err.name === 'AbortError') return
      setState({ content: null, loading: false, error: err.message, tokens: 0, cached: false })
    }
  }, [])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setState(initialState)
  }, [])

  return { ...state, generate, reset }
}
