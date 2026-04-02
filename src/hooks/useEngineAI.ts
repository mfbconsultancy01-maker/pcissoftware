'use client'

import { useState, useCallback, useRef } from 'react'

// ============================================================================
// ENGINE AI Hook -- Client-side interface for AI-powered narratives
// ============================================================================
// Provides loading states, caching, and error handling for all ENGINE
// AI endpoints. Panels call these hooks instead of generating templates.
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

// Simple in-memory cache to avoid re-generating for the same inputs
const narrativeCache = new Map<string, { content: string; tokens: number; timestamp: number }>()
const CACHE_TTL = 10 * 60 * 1000 // 10 minutes

function getCached(key: string): { content: string; tokens: number } | null {
  const entry = narrativeCache.get(key)
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return { content: entry.content, tokens: entry.tokens }
  }
  if (entry) narrativeCache.delete(key)
  return null
}

function setCache(key: string, content: string, tokens: number) {
  narrativeCache.set(key, { content, tokens, timestamp: Date.now() })
  // Keep cache size reasonable
  if (narrativeCache.size > 50) {
    const oldest = narrativeCache.keys().next().value
    if (oldest) narrativeCache.delete(oldest)
  }
}

// ── Purpose Analysis Hook ──────────────────────────────────────────────

export function usePurposeAnalysis() {
  const [state, setState] = useState<AIState>(initialState)
  const abortRef = useRef<AbortController | null>(null)

  const generate = useCallback(async (payload: Record<string, any>) => {
    const cacheKey = `purpose-${payload.clientName}-${payload.primaryPurpose}`
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
      const res = await fetch('/api/engine/purpose-analysis', {
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
      setCache(cacheKey, data.analysis, data.tokens)
      setState({ content: data.analysis, loading: false, error: null, tokens: data.tokens, cached: false })
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

// ── Pillar Context Hook ────────────────────────────────────────────────

export function usePillarContext() {
  const [state, setState] = useState<AIState>(initialState)
  const abortRef = useRef<AbortController | null>(null)

  const generate = useCallback(async (payload: Record<string, any>) => {
    const cacheKey = `pillar-${payload.clientName}-${payload.propertyName}-${payload.pillarShortCode}`
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
      const res = await fetch('/api/engine/pillar-context', {
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
      setCache(cacheKey, data.analysis, data.tokens)
      setState({ content: data.analysis, loading: false, error: null, tokens: data.tokens, cached: false })
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

// ── Match Narrative Hook ───────────────────────────────────────────────

export function useMatchNarrative() {
  const [state, setState] = useState<AIState>(initialState)
  const abortRef = useRef<AbortController | null>(null)

  const generate = useCallback(async (payload: Record<string, any>) => {
    const cacheKey = `narrative-${payload.matchId}`
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
      const res = await fetch('/api/engine/match-narrative', {
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
      setCache(cacheKey, data.narrative, data.tokens)
      setState({ content: data.narrative, loading: false, error: null, tokens: data.tokens, cached: false })
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
