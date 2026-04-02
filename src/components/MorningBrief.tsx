'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import AIBriefOrb from './AIBriefOrb'
import {
  clients,
  getClient,
  getProfile,
  getEngagement,
  getDecayAlerts,
  getBookHealth,
  getHotPredictions,
  getActRecommendations,
  getProperty,
  signals,
  matches,
  predictions,
  relationships,
  engagementMetrics,
  cognitiveProfiles,
  advisorPerformance,
  recommendations,
} from '@/lib/mockData'

// ════════════════════════════════════════
// DATA PREP
// ════════════════════════════════════════
function useBriefData() {
  return useMemo(() => {
    const bookHealth = getBookHealth()
    const hotPredictions = getHotPredictions()
    const allPredictions = predictions
    const decayAlerts = getDecayAlerts()
    const actItems = getActRecommendations()
    const allRecommendations = recommendations
    const topMatches = [...matches].sort((a, b) => b.overallScore - a.overallScore).slice(0, 5)

    // Tier breakdown
    const tiers = { UHNW: 0, HNW: 0, Affluent: 0 }
    clients.forEach(c => { if (c.type in tiers) tiers[c.type as keyof typeof tiers]++ })

    // Total portfolio value
    const totalPortfolio = clients.reduce((s, c) => s + (c.financialProfile?.portfolioValue || 0), 0)

    // Recent signals
    const recentSignals = [...signals].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 8)

    // Engagement distribution
    const engDist = { thriving: 0, active: 0, cooling: 0, cold: 0, dormant: 0 }
    engagementMetrics.forEach(e => { if (e.status in engDist) engDist[e.status as keyof typeof engDist]++ })

    // Avg engagement score
    const avgEngagement = Math.round(engagementMetrics.reduce((s, e) => s + e.engagementScore, 0) / engagementMetrics.length)

    // Top cognitive traits across book
    const traitCounts: Record<string, number> = {}
    cognitiveProfiles.forEach(p => p.keyTraits.forEach(t => { traitCounts[t] = (traitCounts[t] || 0) + 1 }))
    const topTraits = Object.entries(traitCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)

    // Relationship count
    const relCount = relationships.length

    // Momentum breakdown
    const heating = engagementMetrics.filter(e => e.momentum === 'heating').length
    const cooling = engagementMetrics.filter(e => e.momentum === 'cooling').length
    const stable = engagementMetrics.filter(e => e.momentum === 'stable').length

    // Advisor performance
    const perf = advisorPerformance

    return {
      bookHealth, hotPredictions, allPredictions, decayAlerts, actItems, allRecommendations,
      topMatches, tiers, totalPortfolio, recentSignals, engDist, avgEngagement,
      topTraits, relCount, heating, cooling, stable, perf,
    }
  }, [])
}

// ════════════════════════════════════════
// TYPEWRITER
// ════════════════════════════════════════
function useTypewriter(text: string, active: boolean, speed = 25) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!active) { setDisplayed(''); setDone(false); return }
    let i = 0
    setDisplayed('')
    setDone(false)
    // Batch 3 chars at 75ms for same visual speed but 3x fewer DOM updates
    const charsPerTick = 3
    const interval = setInterval(() => {
      i += charsPerTick
      if (i >= text.length) { setDisplayed(text); setDone(true); clearInterval(interval) }
      else { setDisplayed(text.slice(0, i)) }
    }, speed * charsPerTick)
    return () => clearInterval(interval)
  }, [text, active, speed])

  return { displayed, done }
}

// ════════════════════════════════════════
// AMBIENT DATA NETWORK — living intelligence system
// ════════════════════════════════════════
function AmbientDataNetwork({ active, speaking }: { active: boolean; speaking: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const activeRef = useRef(false)
  const speakRef = useRef(0)

  useEffect(() => { activeRef.current = active }, [active])
  useEffect(() => { speakRef.current = speaking }, [speaking])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const W = () => window.innerWidth
    const H = () => window.innerHeight

    // ── Data nodes ──
    const clientData = clients.slice(0, 18).map(c => ({
      initials: c.initials || c.name.split(' ').map(w => w[0]).join(''),
      name: c.name.split(' ')[0],
    }))
    const metricTexts = ['87%', '92%', '74%', '61%', '95%', '83%', '$4.2M', '$8.7M', '$2.1M', '$12.5M', 'A+', 'A', 'B+', '↑12%', '↑8%', '↓3%']
    const labelTexts = ['CLIENT ENGINE', 'MARKET INTEL', 'MATCH ENGINE', 'ADVISOR OUTPUT', 'PREDICT', 'DECAY', 'SIGNAL', 'COGNITIVE']

    interface Node {
      x: number; y: number
      homeX: number; homeY: number
      vx: number; vy: number
      text: string; subtext?: string
      kind: 'client' | 'metric' | 'label' | 'dot'
      size: number
      baseAlpha: number
      phase: number
      breatheSpeed: number
      activeUntil: number // time when node "activates" with a flash
      pulseRadius: number // expanding ring
    }

    const nodes: Node[] = []
    const w0 = W(), h0 = H()

    // Place nodes strategically — avoid center 30% circle
    const placeNode = (): [number, number] => {
      let x: number, y: number
      do {
        x = Math.random()
        y = Math.random()
      } while (Math.hypot(x - 0.5, y - 0.5) < 0.18)
      return [x * w0, y * h0]
    }

    // Client nodes (16)
    for (let i = 0; i < 16; i++) {
      const [x, y] = placeNode()
      const cd = clientData[i % clientData.length]
      nodes.push({
        x, y, homeX: x, homeY: y,
        vx: (Math.random() - 0.5) * 0.08, vy: (Math.random() - 0.5) * 0.06,
        text: cd.initials, subtext: cd.name, kind: 'client',
        size: 9, baseAlpha: 0.14, phase: Math.random() * Math.PI * 2,
        breatheSpeed: 0.3 + Math.random() * 0.4,
        activeUntil: 0, pulseRadius: 0,
      })
    }

    // Metric nodes (12)
    for (let i = 0; i < 12; i++) {
      const [x, y] = placeNode()
      nodes.push({
        x, y, homeX: x, homeY: y,
        vx: (Math.random() - 0.5) * 0.06, vy: (Math.random() - 0.5) * 0.04,
        text: metricTexts[i % metricTexts.length], kind: 'metric',
        size: 11, baseAlpha: 0.09, phase: Math.random() * Math.PI * 2,
        breatheSpeed: 0.2 + Math.random() * 0.3,
        activeUntil: 0, pulseRadius: 0,
      })
    }

    // Label nodes (8)
    for (let i = 0; i < 8; i++) {
      const [x, y] = placeNode()
      nodes.push({
        x, y, homeX: x, homeY: y,
        vx: (Math.random() - 0.5) * 0.03, vy: (Math.random() - 0.5) * 0.02,
        text: labelTexts[i], kind: 'label',
        size: 7, baseAlpha: 0.06, phase: Math.random() * Math.PI * 2,
        breatheSpeed: 0.15 + Math.random() * 0.2,
        activeUntil: 0, pulseRadius: 0,
      })
    }

    // Floating micro-dots (60) — ambient particle dust
    for (let i = 0; i < 60; i++) {
      const [x, y] = placeNode()
      nodes.push({
        x, y, homeX: x, homeY: y,
        vx: (Math.random() - 0.5) * 0.2, vy: (Math.random() - 0.5) * 0.15,
        text: '', kind: 'dot',
        size: 1 + Math.random(), baseAlpha: 0.04 + Math.random() * 0.04,
        phase: Math.random() * Math.PI * 2,
        breatheSpeed: 0.5 + Math.random() * 0.5,
        activeUntil: 0, pulseRadius: 0,
      })
    }

    // ── Data stream particles: travel between connected nodes ──
    interface StreamParticle {
      fromIdx: number; toIdx: number
      progress: number // 0-1
      speed: number
      alive: boolean
    }
    const streams: StreamParticle[] = []
    const MAX_STREAMS = 12

    // ── Pulse ripples: expanding rings from activated nodes ──
    interface Ripple {
      x: number; y: number
      radius: number
      maxRadius: number
      alpha: number
    }
    const ripples: Ripple[] = []

    let time = 0
    let fadeIn = 0
    let nextActivation = 1.5 // time until next node activation
    let nextStream = 0.5

    const render = () => {
      if (document.hidden) {
        animRef.current = requestAnimationFrame(render)
        return
      }
      time += 0.016
      const w = W(), h = H()
      ctx.clearRect(0, 0, w, h)

      if (!activeRef.current) {
        fadeIn = Math.max(0, fadeIn - 0.015)
        if (fadeIn <= 0) { animRef.current = requestAnimationFrame(render); return }
      } else {
        fadeIn = Math.min(1, fadeIn + 0.008)
      }

      const amp = speakRef.current
      const gA = fadeIn // global alpha

      // ── Random node activation (flash + ripple) ──
      nextActivation -= 0.016
      if (nextActivation <= 0 && fadeIn > 0.3) {
        const idx = Math.floor(Math.random() * nodes.length)
        const n = nodes[idx]
        if (n.kind !== 'dot') {
          n.activeUntil = time + 1.2 + Math.random() * 0.8
          ripples.push({
            x: n.x, y: n.y,
            radius: 0, maxRadius: 60 + Math.random() * 80,
            alpha: 0.08 + amp * 0.04,
          })
        }
        nextActivation = 1.5 + Math.random() * 3 - amp * 1.5
      }

      // ── Spawn data streams ──
      nextStream -= 0.016
      if (nextStream <= 0 && streams.filter(s => s.alive).length < MAX_STREAMS && fadeIn > 0.3) {
        // Find two connected nodes (non-dot, within range)
        const textNodes = nodes.filter(n => n.kind !== 'dot')
        const from = Math.floor(Math.random() * textNodes.length)
        const fromNode = textNodes[from]
        // Find nearest neighbor
        let bestDist = Infinity, bestIdx = -1
        for (let i = 0; i < textNodes.length; i++) {
          if (i === from) continue
          const d = Math.hypot(textNodes[i].x - fromNode.x, textNodes[i].y - fromNode.y)
          if (d < 350 && d < bestDist) { bestDist = d; bestIdx = i }
        }
        if (bestIdx >= 0) {
          const fromGlobal = nodes.indexOf(fromNode)
          const toGlobal = nodes.indexOf(textNodes[bestIdx])
          streams.push({ fromIdx: fromGlobal, toIdx: toGlobal, progress: 0, speed: 0.008 + Math.random() * 0.012, alive: true })
        }
        nextStream = 0.4 + Math.random() * 1.2 - amp * 0.3
      }

      // ── Update nodes ──
      for (const n of nodes) {
        // Organic breathing movement
        const bx = Math.sin(time * n.breatheSpeed + n.phase) * 0.3
        const by = Math.cos(time * n.breatheSpeed * 0.7 + n.phase + 1) * 0.2
        n.x += n.vx + bx
        n.y += n.vy + by

        // Soft drift back toward home (prevents permanent migration)
        n.x += (n.homeX - n.x) * 0.0003
        n.y += (n.homeY - n.y) * 0.0003

        // Wrap
        if (n.x < -60) n.x = w + 50
        if (n.x > w + 60) n.x = -50
        if (n.y < -60) n.y = h + 50
        if (n.y > h + 60) n.y = -50

        // Subtle radial push from speech
        const dx = n.x - w / 2, dy = n.y - h / 2
        const dist = Math.sqrt(dx * dx + dy * dy) + 1
        n.x += (dx / dist) * amp * 0.25
        n.y += (dy / dist) * amp * 0.18
      }

      // ── LAYER 0: Hex grid underlay ──
      const hexSize = 55
      const hexH = hexSize * Math.sqrt(3)
      ctx.lineWidth = 0.3
      for (let row = -1; row < h / hexH + 1; row++) {
        for (let col = -1; col < w / (hexSize * 1.5) + 1; col++) {
          const hx = col * hexSize * 1.5
          const hy = row * hexH + (col % 2 ? hexH / 2 : 0)
          const dCenter = Math.hypot(hx - w / 2, hy - h / 2)
          // Fade out near center and edges
          const centerFade = Math.min(1, Math.max(0, (dCenter - 120) / 300))
          const edgeFade = Math.min(1, Math.min(hx, w - hx, hy, h - hy) / 100)
          const hexAlpha = 0.012 * centerFade * edgeFade * gA * (1 + amp * 0.3)
          if (hexAlpha < 0.002) continue
          ctx.strokeStyle = `rgba(201,168,76,${hexAlpha})`
          ctx.beginPath()
          for (let corner = 0; corner < 6; corner++) {
            const angle = Math.PI / 3 * corner + Math.PI / 6
            const px = hx + hexSize * 0.4 * Math.cos(angle)
            const py = hy + hexSize * 0.4 * Math.sin(angle)
            corner === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
          }
          ctx.closePath()
          ctx.stroke()
        }
      }

      // ── LAYER 1: Connection lines ──
      const maxDist = 280
      ctx.lineWidth = 0.4
      const textNodes = nodes.filter(n => n.kind !== 'dot')
      for (let i = 0; i < textNodes.length; i++) {
        for (let j = i + 1; j < textNodes.length; j++) {
          const ni = textNodes[i], nj = textNodes[j]
          const dx = ni.x - nj.x, dy = ni.y - nj.y
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d < maxDist) {
            const fade = 1 - d / maxDist
            const pulse = 0.8 + Math.sin(time * 0.5 + i * 0.3 + j * 0.2) * 0.2
            const isActive = (ni.activeUntil > time || nj.activeUntil > time) ? 2.5 : 1
            const alpha = fade * pulse * 0.035 * gA * isActive * (1 + amp * 0.4)
            if (alpha > 0.002) {
              ctx.strokeStyle = `rgba(201,168,76,${alpha})`
              ctx.beginPath()
              // Slight curve instead of straight line
              const mx = (ni.x + nj.x) / 2 + Math.sin(time * 0.3 + i) * 8
              const my = (ni.y + nj.y) / 2 + Math.cos(time * 0.25 + j) * 8
              ctx.moveTo(ni.x, ni.y)
              ctx.quadraticCurveTo(mx, my, nj.x, nj.y)
              ctx.stroke()
            }
          }
        }
      }

      // ── LAYER 2: Data stream particles ──
      for (const s of streams) {
        if (!s.alive) continue
        s.progress += s.speed + amp * 0.003
        if (s.progress >= 1) { s.alive = false; continue }

        const from = nodes[s.fromIdx], to = nodes[s.toIdx]
        // Quadratic bezier path (same curve as connection)
        const mx = (from.x + to.x) / 2 + Math.sin(time * 0.3 + s.fromIdx) * 8
        const my = (from.y + to.y) / 2 + Math.cos(time * 0.25 + s.toIdx) * 8
        const t = s.progress
        const invT = 1 - t
        const px = invT * invT * from.x + 2 * invT * t * mx + t * t * to.x
        const py = invT * invT * from.y + 2 * invT * t * my + t * t * to.y

        // Trail of 4 fading dots
        for (let trail = 0; trail < 4; trail++) {
          const tt = Math.max(0, t - trail * 0.03)
          const invTT = 1 - tt
          const tx = invTT * invTT * from.x + 2 * invTT * tt * mx + tt * tt * to.x
          const ty = invTT * invTT * from.y + 2 * invTT * tt * my + tt * tt * to.y
          const trailAlpha = (1 - trail / 4) * 0.2 * gA * Math.sin(t * Math.PI)
          ctx.beginPath()
          ctx.arc(tx, ty, 1.5 - trail * 0.3, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(212,175,116,${trailAlpha})`
          ctx.fill()
        }

        // Bright head
        const headAlpha = 0.35 * gA * Math.sin(t * Math.PI)
        ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,230,180,${headAlpha})`; ctx.fill()
        // Glow
        ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(212,175,116,${headAlpha * 0.15})`; ctx.fill()
      }
      // Clean dead streams
      for (let i = streams.length - 1; i >= 0; i--) {
        if (!streams[i].alive) streams.splice(i, 1)
      }

      // ── LAYER 3: Pulse ripples ──
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i]
        r.radius += 0.6 + amp * 0.3
        r.alpha *= 0.985
        if (r.radius > r.maxRadius || r.alpha < 0.002) { ripples.splice(i, 1); continue }

        ctx.beginPath()
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(201,168,76,${r.alpha * gA})`
        ctx.lineWidth = 0.6
        ctx.stroke()
      }

      // ── LAYER 4: Node rendering ──
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      for (const n of nodes) {
        const breathe = 0.75 + Math.sin(time * n.breatheSpeed + n.phase) * 0.25
        const isActive = n.activeUntil > time
        const activeMult = isActive ? 1.5 + Math.sin(time * 8) * 0.3 : 1
        const alpha = n.baseAlpha * breathe * gA * activeMult * (1 + amp * 0.25)

        if (n.kind === 'dot') {
          ctx.beginPath()
          ctx.arc(n.x, n.y, n.size, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(201,168,76,${alpha})`
          ctx.fill()
          continue
        }

        if (n.kind === 'client') {
          // Outer ring
          ctx.beginPath(); ctx.arc(n.x, n.y, 18, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(201,168,76,${alpha * 0.35 * activeMult})`
          ctx.lineWidth = isActive ? 0.8 : 0.4
          ctx.stroke()

          // Fill
          ctx.beginPath(); ctx.arc(n.x, n.y, 17, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(201,168,76,${alpha * 0.08})`; ctx.fill()

          // Active glow
          if (isActive) {
            const glow = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, 35)
            glow.addColorStop(0, `rgba(212,175,116,${alpha * 0.12})`)
            glow.addColorStop(1, 'rgba(212,175,116,0)')
            ctx.fillStyle = glow
            ctx.beginPath(); ctx.arc(n.x, n.y, 35, 0, Math.PI * 2); ctx.fill()
          }

          // Initials
          ctx.font = `500 ${n.size}px Inter, sans-serif`
          ctx.fillStyle = `rgba(212,175,116,${alpha * 1.8})`
          ctx.fillText(n.text, n.x, n.y - 1)

          // Subtle name below (only when active)
          if (isActive && n.subtext) {
            ctx.font = '400 7px Inter, sans-serif'
            ctx.fillStyle = `rgba(201,168,76,${alpha * 0.8})`
            ctx.fillText(n.subtext, n.x, n.y + 25)
          }

        } else if (n.kind === 'metric') {
          // Small tick mark above
          ctx.strokeStyle = `rgba(201,168,76,${alpha * 0.4})`
          ctx.lineWidth = 0.4
          ctx.beginPath(); ctx.moveTo(n.x, n.y - 10); ctx.lineTo(n.x, n.y - 6); ctx.stroke()

          ctx.font = `300 ${n.size}px 'Playfair Display', serif`
          ctx.fillStyle = `rgba(255,235,190,${alpha * 1.3 * activeMult})`
          ctx.fillText(n.text, n.x, n.y)

          // Active underline
          if (isActive) {
            ctx.strokeStyle = `rgba(212,175,116,${alpha * 0.5})`
            ctx.lineWidth = 0.5
            const tw = ctx.measureText(n.text).width
            ctx.beginPath(); ctx.moveTo(n.x - tw / 2, n.y + 8); ctx.lineTo(n.x + tw / 2, n.y + 8); ctx.stroke()
          }

        } else if (n.kind === 'label') {
          // Bracketed label with dot
          ctx.beginPath(); ctx.arc(n.x - 30, n.y, 1.5, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(201,168,76,${alpha * 0.6 * activeMult})`; ctx.fill()

          ctx.font = `500 ${n.size}px Inter, sans-serif`
          ctx.fillStyle = `rgba(201,168,76,${alpha * 0.9 * activeMult})`
          ctx.fillText(n.text, n.x, n.y)

          // Thin line extending from label
          ctx.strokeStyle = `rgba(201,168,76,${alpha * 0.2})`
          ctx.lineWidth = 0.3
          const tw = ctx.measureText(n.text).width
          ctx.beginPath(); ctx.moveTo(n.x + tw / 2 + 4, n.y); ctx.lineTo(n.x + tw / 2 + 20 + Math.sin(time + n.phase) * 5, n.y); ctx.stroke()
        }
      }

      // ── LAYER 5: Scanning beam (slow diagonal sweep) ──
      const scanAngle = time * 0.08
      const scanX = w / 2 + Math.cos(scanAngle) * w * 0.8
      const scanY = h / 2 + Math.sin(scanAngle) * h * 0.6
      const scanGrad = ctx.createRadialGradient(scanX, scanY, 0, scanX, scanY, 200)
      scanGrad.addColorStop(0, `rgba(201,168,76,${0.015 * gA * (1 + amp * 0.3)})`)
      scanGrad.addColorStop(0.5, `rgba(201,168,76,${0.005 * gA})`)
      scanGrad.addColorStop(1, 'rgba(201,168,76,0)')
      ctx.fillStyle = scanGrad
      ctx.beginPath(); ctx.arc(scanX, scanY, 200, 0, Math.PI * 2); ctx.fill()

      // ── LAYER 6: Center-connected radial lines (orb → nearby nodes) ──
      const orbX = w / 2, orbY = h / 2
      for (const n of nodes) {
        if (n.kind === 'dot') continue
        const d = Math.hypot(n.x - orbX, n.y - orbY)
        if (d < 300 && d > 100) {
          const fade = 1 - (d - 100) / 200
          const alpha = fade * 0.015 * gA * (1 + amp * 0.5)
          if (alpha > 0.002) {
            ctx.strokeStyle = `rgba(201,168,76,${alpha})`
            ctx.lineWidth = 0.3
            ctx.setLineDash([2, 6])
            ctx.beginPath(); ctx.moveTo(orbX, orbY); ctx.lineTo(n.x, n.y); ctx.stroke()
            ctx.setLineDash([])
          }
        }
      }

      animRef.current = requestAnimationFrame(render)
    }

    animRef.current = requestAnimationFrame(render)
    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-10"
      style={{ opacity: active ? 1 : 0, transition: 'opacity 1.5s ease' }}
    />
  )
}

// ════════════════════════════════════════
// NARRATION SLIDE — orb speaks text
// ════════════════════════════════════════
function NarrationSlide({
  lines,
  speaking,
  active,
  onDone,
}: {
  lines: string[]
  speaking: number
  active: boolean
  onDone: () => void
}) {
  const [lineIdx, setLineIdx] = useState(0)
  const [completedLines, setCompletedLines] = useState<string[]>([])
  const [typing, setTyping] = useState(true)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  const currentLine = lines[lineIdx] || ''
  const { displayed, done } = useTypewriter(currentLine, active && typing && lineIdx < lines.length, 35)

  // Reset when deactivated
  useEffect(() => {
    if (!active) {
      setLineIdx(0); setCompletedLines([]); setTyping(true)
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    }
  }, [active])

  // Handle line completion — use ref for timer to avoid cleanup-on-done-change killing it
  useEffect(() => {
    if (!done || !active) return
    setTyping(false)
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      setCompletedLines(prev => [...prev, lines[lineIdx]])
      if (lineIdx < lines.length - 1) {
        setLineIdx(prev => prev + 1)
        setTyping(true)
      } else {
        timerRef.current = setTimeout(() => {
          timerRef.current = null
          onDoneRef.current()
        }, 1800)
      }
    }, 1000)
    // intentionally no cleanup — timer managed via timerRef
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, active, lineIdx, lines])

  // Cleanup on unmount
  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  if (!active) return null

  return (
    <div className="absolute inset-0 z-20">
      {/* Ambient data network — fills the background */}
      <AmbientDataNetwork active={active} speaking={speaking} />

      {/* Centered orb + text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-30">
        {/* Orb */}
        <div className="mb-5">
          <AIBriefOrb speakingAmplitude={speaking} size={160} visible={true} />
        </div>

        {/* Label */}
        <div className="mb-5">
          <span className="text-[9px] uppercase tracking-[0.5em] text-pcis-gold/25"
            style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>
            Intelligence Brief
          </span>
        </div>

        {/* Text — only the current line shown, previous lines fade to dimmer */}
        <div className="max-w-lg px-6 text-center">
          {completedLines.map((line, i) => (
            <p key={i} className="text-sm text-white/30 mb-2 leading-relaxed"
              style={{ fontFamily: "'Inter', sans-serif", transition: 'color 0.5s ease' }}>{line}</p>
          ))}
          {typing && lineIdx < lines.length && (
            <p className="text-[15px] text-white/85 leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
              {displayed}
              {!done && (
                <span className="inline-block w-[2px] h-[15px] bg-pcis-gold/60 ml-0.5 animate-pulse align-middle" />
              )}
            </p>
          )}
          {!typing && lineIdx < lines.length && (
            <p className="text-[15px] text-white/85 leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
              {currentLine}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════
// DATA SLIDES — comprehensive full-screen overviews
// ════════════════════════════════════════

// Shared stagger animation helper
function anim(reveal: boolean, i: number, base = 0.15) {
  return {
    opacity: reveal ? 1 : 0,
    transform: reveal ? 'translateY(0)' : 'translateY(16px)',
    transition: `all 0.5s ease ${base + i * 0.08}s`,
  }
}

// ── BOOK HEALTH: donut + tiers + portfolio + momentum + engagement + signals ──
function BookHealthSlide({ active, data }: { active: boolean; data: ReturnType<typeof useBriefData> }) {
  const [reveal, setReveal] = useState(false)
  useEffect(() => { if (active) { setTimeout(() => setReveal(true), 100) } else { setReveal(false) } }, [active])
  if (!active) return null

  const bh = data.bookHealth
  const segments = [
    { label: 'Thriving', count: (bh as any).thriving || 0, color: '#4ade80' },
    { label: 'Active', count: (bh as any).active || 0, color: '#d4a574' },
    { label: 'Cooling', count: (bh as any).cooling || 0, color: '#f59e0b' },
    { label: 'Cold', count: (bh as any).cold || 0, color: '#ef4444' },
    { label: 'Dormant', count: (bh as any).dormant || 0, color: '#6b7280' },
  ]
  const tierItems = [
    { label: 'UHNW', count: data.tiers.UHNW, color: '#d4a574' },
    { label: 'HNW', count: data.tiers.HNW, color: '#a08560' },
    { label: 'Affluent', count: data.tiers.Affluent, color: '#7a6a50' },
  ]
  const portfolioStr = data.totalPortfolio >= 1e9
    ? `$${(data.totalPortfolio / 1e9).toFixed(1)}B`
    : `$${(data.totalPortfolio / 1e6).toFixed(0)}M`

  return (
    <div className="absolute inset-0 flex items-center justify-center z-20 px-8">
      <div className="w-full max-w-6xl grid grid-cols-12 gap-5 items-center" style={{ opacity: reveal ? 1 : 0, transition: 'opacity 0.6s ease' }}>

        {/* LEFT: Donut + health score (5 cols) */}
        <div className="col-span-5 flex flex-col items-center">
          <div className="relative inline-flex items-center justify-center mb-5">
            <svg width="200" height="200" viewBox="0 0 200 200">
              {(() => {
                let offset = 0
                return segments.map((seg, i) => {
                  const pct = seg.count / bh.total
                  const dashLen = pct * 502
                  const el = (
                    <circle key={i} cx="100" cy="100" r="80" fill="none" stroke={seg.color} strokeWidth="7"
                      strokeDasharray={`${dashLen} ${502 - dashLen}`} strokeDashoffset={-offset}
                      style={{ opacity: reveal ? 0.8 : 0, transition: `opacity 0.5s ease ${0.3 + i * 0.12}s`, transform: 'rotate(-90deg)', transformOrigin: 'center' }}
                    />
                  )
                  offset += dashLen
                  return el
                })
              })()}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-light text-white" style={{ fontFamily: "'Playfair Display', serif" }}>{bh.healthPercent}%</span>
              <span className="text-[9px] uppercase tracking-[0.25em] text-pcis-text-muted mt-1">Book Health</span>
            </div>
          </div>
          {/* Segment legend */}
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
            {segments.filter(s => s.count > 0).map((seg, i) => (
              <div key={i} className="flex items-center gap-1.5" style={anim(reveal, i, 0.5)}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: seg.color }} />
                <span className="text-[9px] text-pcis-text-muted">{seg.count} {seg.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: KPI grid (7 cols) */}
        <div className="col-span-7 grid grid-cols-3 gap-3">
          {/* Total portfolio */}
          <div className="bg-pcis-card/40 border border-pcis-border/50 rounded-lg p-4" style={anim(reveal, 0)}>
            <div className="text-[9px] uppercase tracking-[0.2em] text-pcis-text-muted/60 mb-2">Total Portfolio</div>
            <div className="text-2xl font-light text-white" style={{ fontFamily: "'Playfair Display', serif" }}>{portfolioStr}</div>
            <div className="text-[10px] text-pcis-gold/50 mt-1">{bh.total} clients under advisory</div>
          </div>

          {/* Tier breakdown */}
          <div className="bg-pcis-card/40 border border-pcis-border/50 rounded-lg p-4" style={anim(reveal, 1)}>
            <div className="text-[9px] uppercase tracking-[0.2em] text-pcis-text-muted/60 mb-2">Client Tiers</div>
            {tierItems.map((t, i) => (
              <div key={i} className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-pcis-text-muted">{t.label}</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: reveal ? `${(t.count / bh.total) * 100}%` : '0%', background: t.color, transition: `width 0.8s ease ${0.5 + i * 0.1}s` }} />
                  </div>
                  <span className="text-xs text-white/80 w-5 text-right">{t.count}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Avg engagement */}
          <div className="bg-pcis-card/40 border border-pcis-border/50 rounded-lg p-4" style={anim(reveal, 2)}>
            <div className="text-[9px] uppercase tracking-[0.2em] text-pcis-text-muted/60 mb-2">Avg Engagement</div>
            <div className="text-2xl font-light text-white" style={{ fontFamily: "'Playfair Display', serif" }}>{data.avgEngagement}</div>
            <div className="text-[10px] text-pcis-text-muted/50 mt-1">out of 100</div>
          </div>

          {/* Momentum */}
          <div className="bg-pcis-card/40 border border-pcis-border/50 rounded-lg p-4" style={anim(reveal, 3)}>
            <div className="text-[9px] uppercase tracking-[0.2em] text-pcis-text-muted/60 mb-2">Momentum</div>
            <div className="flex items-center gap-3">
              <div className="text-center">
                <div className="text-lg text-green-400/80 font-light">{data.heating}</div>
                <div className="text-[8px] text-green-400/50 uppercase">Heating</div>
              </div>
              <div className="text-center">
                <div className="text-lg text-white/60 font-light">{data.stable}</div>
                <div className="text-[8px] text-white/30 uppercase">Stable</div>
              </div>
              <div className="text-center">
                <div className="text-lg text-amber-400/80 font-light">{data.cooling}</div>
                <div className="text-[8px] text-amber-400/50 uppercase">Cooling</div>
              </div>
            </div>
          </div>

          {/* Relationships */}
          <div className="bg-pcis-card/40 border border-pcis-border/50 rounded-lg p-4" style={anim(reveal, 4)}>
            <div className="text-[9px] uppercase tracking-[0.2em] text-pcis-text-muted/60 mb-2">Network</div>
            <div className="text-2xl font-light text-white" style={{ fontFamily: "'Playfair Display', serif" }}>{data.relCount}</div>
            <div className="text-[10px] text-pcis-text-muted/50 mt-1">cross-client relationships</div>
          </div>

          {/* Recent signals */}
          <div className="bg-pcis-card/40 border border-pcis-border/50 rounded-lg p-4" style={anim(reveal, 5)}>
            <div className="text-[9px] uppercase tracking-[0.2em] text-pcis-text-muted/60 mb-2">Active Signals</div>
            <div className="text-2xl font-light text-white" style={{ fontFamily: "'Playfair Display', serif" }}>{data.recentSignals.length}</div>
            <div className="flex gap-1 mt-1.5">
              {data.recentSignals.slice(0, 5).map((s, i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-pcis-gold/40" style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── PREDICTIONS: all predictions + confidence distribution + pattern types ──
function PredictionsSlide({ active, data }: { active: boolean; data: ReturnType<typeof useBriefData> }) {
  const [reveal, setReveal] = useState(false)
  useEffect(() => { if (active) setTimeout(() => setReveal(true), 100); else setReveal(false) }, [active])
  if (!active) return null

  const hot = data.hotPredictions
  const all = data.allPredictions
  const patternCounts: Record<string, number> = {}
  all.forEach(p => { patternCounts[p.pattern] = (patternCounts[p.pattern] || 0) + 1 })
  const avgConf = Math.round(hot.reduce((s, p) => s + p.confidence, 0) / (hot.length || 1))

  return (
    <div className="absolute inset-0 flex items-center justify-center z-20 px-8">
      <div className="w-full max-w-6xl" style={{ opacity: reveal ? 1 : 0, transition: 'opacity 0.6s ease' }}>
        {/* Header bar */}
        <div className="flex items-center justify-between mb-5">
          <span className="text-[10px] uppercase tracking-[0.4em] text-pcis-gold/40">⚡ Prediction Engine</span>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <span className="text-lg text-white/80 font-light" style={{ fontFamily: "'Playfair Display', serif" }}>{all.length}</span>
              <span className="text-[9px] text-pcis-text-muted/50 ml-1.5 uppercase">Total</span>
            </div>
            <div className="text-center">
              <span className="text-lg text-pcis-gold/80 font-light" style={{ fontFamily: "'Playfair Display', serif" }}>{hot.length}</span>
              <span className="text-[9px] text-pcis-text-muted/50 ml-1.5 uppercase">High-Conf</span>
            </div>
            <div className="text-center">
              <span className="text-lg text-white/80 font-light" style={{ fontFamily: "'Playfair Display', serif" }}>{avgConf}%</span>
              <span className="text-[9px] text-pcis-text-muted/50 ml-1.5 uppercase">Avg Conf</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4">
          {/* Main prediction cards (8 cols) */}
          <div className="col-span-8 grid grid-cols-2 gap-3">
            {hot.slice(0, 4).map((pred, i) => {
              const client = getClient(pred.clientId)
              const eng = getEngagement(pred.clientId)
              const profile = getProfile(pred.clientId)
              return (
                <div key={i} className="bg-pcis-card/50 border border-pcis-border/50 rounded-lg p-4 flex gap-3" style={anim(reveal, i)}>
                  <div className="flex-shrink-0">
                    <div className="w-11 h-11 rounded-full bg-pcis-gold/10 border border-pcis-gold/20 flex items-center justify-center">
                      <span className="text-pcis-gold/80 text-xs font-medium">{client?.initials}</span>
                    </div>
                    {/* Mini confidence ring */}
                    <div className="relative w-11 h-11 mt-2">
                      <svg width="44" height="44" viewBox="0 0 44 44">
                        <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="2.5" />
                        <circle cx="22" cy="22" r="18" fill="none" stroke="#d4a574" strokeWidth="2.5"
                          strokeDasharray={`${pred.confidence / 100 * 113} ${113 - pred.confidence / 100 * 113}`}
                          style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', transition: `stroke-dasharray 0.8s ease ${0.4 + i * 0.1}s` }}
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] text-pcis-gold/80">{pred.confidence}%</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white/90 text-sm font-medium">{client?.name}</div>
                    <div className="text-pcis-text-muted text-[10px] mb-1.5">{client?.type} · {client?.category} · {client?.location}</div>
                    <div className="text-pcis-gold/70 text-xs font-medium mb-1">{pred.pattern}</div>
                    <div className="text-pcis-text-muted/60 text-[10px] leading-relaxed mb-2">{pred.description}</div>
                    <div className="flex items-center gap-2">
                      {eng && <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-pcis-text-muted">{eng.momentum}</span>}
                      {profile && <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-pcis-text-muted">{profile.keyTraits[0]}</span>}
                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${pred.confidence >= 85 ? 'bg-green-500/10 text-green-400/70' : 'bg-pcis-gold/10 text-pcis-gold/60'}`}>
                        {pred.confidence >= 85 ? 'Very High' : 'High'}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Right sidebar: pattern distribution + all predictions list (4 cols) */}
          <div className="col-span-4 space-y-3">
            <div className="bg-pcis-card/40 border border-pcis-border/50 rounded-lg p-4" style={anim(reveal, 5)}>
              <div className="text-[9px] uppercase tracking-[0.2em] text-pcis-text-muted/60 mb-3">Pattern Distribution</div>
              {Object.entries(patternCounts).map(([pattern, count], i) => (
                <div key={i} className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-pcis-text-muted truncate mr-2">{pattern}</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-10 h-1 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full rounded-full bg-pcis-gold/40" style={{ width: reveal ? `${(count / all.length) * 100}%` : '0%', transition: `width 0.6s ease ${0.5 + i * 0.08}s` }} />
                    </div>
                    <span className="text-[10px] text-white/60 w-3 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* All predictions mini list */}
            <div className="bg-pcis-card/40 border border-pcis-border/50 rounded-lg p-4" style={anim(reveal, 6)}>
              <div className="text-[9px] uppercase tracking-[0.2em] text-pcis-text-muted/60 mb-3">All Active ({all.length})</div>
              {all.slice(0, 6).map((p, i) => {
                const c = getClient(p.clientId)
                return (
                  <div key={i} className="flex items-center gap-2 mb-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${p.confidence >= 70 ? 'bg-pcis-gold/60' : 'bg-white/20'}`} />
                    <span className="text-[10px] text-white/60 truncate flex-1">{c?.name}</span>
                    <span className="text-[9px] text-pcis-text-muted/50">{p.confidence}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── DECAY: alerts + risk summary + engagement velocity + portfolio at risk ──
function DecaySlide({ active, data }: { active: boolean; data: ReturnType<typeof useBriefData> }) {
  const [reveal, setReveal] = useState(false)
  useEffect(() => { if (active) setTimeout(() => setReveal(true), 100); else setReveal(false) }, [active])
  if (!active) return null

  const alerts = data.decayAlerts
  const coldCount = alerts.filter(a => a.status === 'cold' || a.status === 'dormant').length
  const portfolioAtRisk = alerts.reduce((sum, a) => {
    const c = getClient(a.clientId)
    return sum + (c?.financialProfile?.portfolioValue || 0)
  }, 0)
  const riskStr = portfolioAtRisk >= 1e9 ? `$${(portfolioAtRisk / 1e9).toFixed(1)}B` : `$${(portfolioAtRisk / 1e6).toFixed(0)}M`
  const avgDays = Math.round(alerts.reduce((s, a) => s + a.daysSinceContact, 0) / (alerts.length || 1))

  return (
    <div className="absolute inset-0 flex items-center justify-center z-20 px-8">
      <div className="w-full max-w-6xl" style={{ opacity: reveal ? 1 : 0, transition: 'opacity 0.6s ease' }}>
        {/* Top stat bar */}
        <div className="flex items-center justify-between mb-5">
          <span className="text-[10px] uppercase tracking-[0.4em] text-amber-400/50">△ Engagement Decay Monitor</span>
          <div className="flex items-center gap-6">
            <div><span className="text-lg text-amber-400/80 font-light" style={{ fontFamily: "'Playfair Display', serif" }}>{alerts.length}</span><span className="text-[9px] text-pcis-text-muted/50 ml-1.5 uppercase">At Risk</span></div>
            <div><span className="text-lg text-red-400/80 font-light" style={{ fontFamily: "'Playfair Display', serif" }}>{coldCount}</span><span className="text-[9px] text-pcis-text-muted/50 ml-1.5 uppercase">Critical</span></div>
            <div><span className="text-lg text-white/70 font-light" style={{ fontFamily: "'Playfair Display', serif" }}>{riskStr}</span><span className="text-[9px] text-pcis-text-muted/50 ml-1.5 uppercase">At Risk</span></div>
            <div><span className="text-lg text-white/60 font-light" style={{ fontFamily: "'Playfair Display', serif" }}>{avgDays}d</span><span className="text-[9px] text-pcis-text-muted/50 ml-1.5 uppercase">Avg Silent</span></div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4">
          {/* Alert cards (9 cols) */}
          <div className="col-span-9 space-y-2.5">
            {alerts.slice(0, 5).map((alert, i) => {
              const client = getClient(alert.clientId)
              const eng = getEngagement(alert.clientId)
              const barWidth = Math.min(100, alert.decayRate)
              const isCold = alert.status === 'cold' || alert.status === 'dormant'
              const clientVal = client?.financialProfile?.portfolioValue || 0
              const valStr = clientVal >= 1e6 ? `$${(clientVal / 1e6).toFixed(1)}M` : `$${(clientVal / 1e3).toFixed(0)}K`
              return (
                <div key={i} className="bg-pcis-card/45 border border-pcis-border/50 rounded-lg p-4 flex items-center gap-4" style={anim(reveal, i)}>
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${isCold ? 'bg-red-500/10 text-red-400/80 border border-red-500/20' : 'bg-amber-500/10 text-amber-400/80 border border-amber-500/20'}`}>
                    {client?.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-white/85 text-sm font-medium">{client?.name}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${isCold ? 'bg-red-500/10 text-red-400/70' : 'bg-amber-500/10 text-amber-400/70'}`}>{alert.status}</span>
                      <span className="text-[9px] text-pcis-text-muted/40">{client?.type} · {valStr}</span>
                    </div>
                    <div className="text-[10px] text-pcis-text-muted mb-1.5">
                      {alert.daysSinceContact}d silent · expected every {alert.expectedInterval}d · velocity {eng?.currentVelocity.toFixed(1)}/wk → baseline {eng?.baselineVelocity.toFixed(1)}/wk
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-1000" style={{
                        width: reveal ? `${barWidth}%` : '0%',
                        background: isCold ? 'linear-gradient(to right, #ef4444, #dc2626)' : 'linear-gradient(to right, #f59e0b, #d97706)',
                        transitionDelay: `${0.3 + i * 0.1}s`,
                      }} />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 w-14">
                    <div className={`text-xl font-light ${isCold ? 'text-red-400/80' : 'text-amber-400/80'}`} style={{ fontFamily: "'Playfair Display', serif" }}>{alert.decayRate}%</div>
                    <div className="text-[8px] uppercase tracking-wider text-pcis-text-muted/40">decay</div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Right panel: risk summary (3 cols) */}
          <div className="col-span-3 space-y-3">
            <div className="bg-pcis-card/40 border border-pcis-border/50 rounded-lg p-4" style={anim(reveal, 6)}>
              <div className="text-[9px] uppercase tracking-[0.2em] text-pcis-text-muted/60 mb-3">Risk by Status</div>
              {[
                { label: 'Cooling', count: data.engDist.cooling, color: '#f59e0b' },
                { label: 'Cold', count: data.engDist.cold, color: '#ef4444' },
                { label: 'Dormant', count: data.engDist.dormant, color: '#6b7280' },
              ].map((r, i) => (
                <div key={i} className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: r.color }} />
                    <span className="text-[10px] text-pcis-text-muted">{r.label}</span>
                  </div>
                  <span className="text-sm text-white/70">{r.count}</span>
                </div>
              ))}
            </div>
            <div className="bg-pcis-card/40 border border-pcis-border/50 rounded-lg p-4" style={anim(reveal, 7)}>
              <div className="text-[9px] uppercase tracking-[0.2em] text-pcis-text-muted/60 mb-2">Top Traits at Risk</div>
              {data.topTraits.slice(0, 4).map(([trait, count], i) => (
                <div key={i} className="text-[10px] text-pcis-text-muted mb-1.5">
                  <span className="text-white/50">{trait}</span> <span className="text-pcis-text-muted/40">× {count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── MATCHES: cards + property details + financial fit + all matches list ──
function MatchesSlide({ active, data }: { active: boolean; data: ReturnType<typeof useBriefData> }) {
  const [reveal, setReveal] = useState(false)
  useEffect(() => { if (active) setTimeout(() => setReveal(true), 100); else setReveal(false) }, [active])
  if (!active) return null

  const allMatches = data.topMatches

  return (
    <div className="absolute inset-0 flex items-center justify-center z-20 px-8">
      <div className="w-full max-w-6xl" style={{ opacity: reveal ? 1 : 0, transition: 'opacity 0.6s ease' }}>
        <div className="flex items-center justify-between mb-5">
          <span className="text-[10px] uppercase tracking-[0.4em] text-pcis-gold/40">◎ Match Engine Results</span>
          <div className="flex items-center gap-6">
            <div><span className="text-lg text-pcis-gold/80 font-light" style={{ fontFamily: "'Playfair Display', serif" }}>{matches.length}</span><span className="text-[9px] text-pcis-text-muted/50 ml-1.5 uppercase">Total Matches</span></div>
            <div><span className="text-lg text-white/80 font-light" style={{ fontFamily: "'Playfair Display', serif" }}>{matches.filter(m => m.grade === 'A+' || m.grade === 'A').length}</span><span className="text-[9px] text-pcis-text-muted/50 ml-1.5 uppercase">Grade A+/A</span></div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4">
          {/* Match cards (9 cols) */}
          <div className="col-span-9 grid grid-cols-3 gap-3">
            {allMatches.slice(0, 3).map((m, i) => {
              const client = getClient(m.clientId)
              const property = getProperty(m.propertyId)
              const priceStr = property ? (property.price >= 1e6 ? `$${(property.price / 1e6).toFixed(1)}M` : `$${(property.price / 1e3).toFixed(0)}K`) : ''
              const pillars = [
                { label: 'Client Fit', value: m.pillars.clientFit },
                { label: 'Financial', value: m.pillars.financial },
                { label: 'Value', value: m.pillars.value },
                { label: 'Timing', value: m.pillars.timing },
              ]
              return (
                <div key={i} className="bg-pcis-card/50 border border-pcis-border/50 rounded-lg p-4" style={anim(reveal, i)}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-pcis-gold text-xl font-light" style={{ fontFamily: "'Playfair Display', serif" }}>{m.grade}</span>
                    <span className="text-[10px] text-pcis-text-muted">{Math.round(m.overallScore * 100)}%</span>
                  </div>
                  <div className="text-sm text-white/85 mb-0.5">{client?.name}</div>
                  <div className="text-[10px] text-pcis-text-muted/60 mb-2">{client?.type} · {client?.category}</div>
                  <div className="border-t border-pcis-border/30 pt-2 mb-2">
                    <div className="text-xs text-pcis-gold/70 font-medium mb-0.5">{property?.name}</div>
                    <div className="text-[10px] text-pcis-text-muted/60">{property?.type} · {property?.area} · {property?.bedrooms}BR · {priceStr}</div>
                    {property?.features && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {property.features.slice(0, 3).map((f, fi) => (
                          <span key={fi} className="text-[8px] px-1.5 py-0.5 rounded bg-pcis-gold/5 text-pcis-gold/40 border border-pcis-gold/10">{f}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Pillar bars */}
                  <div className="space-y-1.5 mt-2">
                    {pillars.map((p, pi) => (
                      <div key={pi} className="flex items-center gap-2">
                        <span className="text-[8px] text-pcis-text-muted/50 w-12 truncate">{p.label}</span>
                        <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
                          <div className="h-full rounded-full bg-pcis-gold/40" style={{ width: reveal ? `${p.value * 100}%` : '0%', transition: `width 0.7s ease ${0.4 + i * 0.1 + pi * 0.06}s` }} />
                        </div>
                        <span className="text-[8px] text-pcis-text-muted/40 w-5 text-right">{Math.round(p.value * 100)}</span>
                      </div>
                    ))}
                  </div>
                  {m.aiIntelligence && (
                    <div className="mt-2 pt-2 border-t border-pcis-border/20">
                      <div className="text-[9px] text-pcis-text-muted/50 leading-relaxed">{m.aiIntelligence}</div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Right sidebar: all matches + available inventory (3 cols) */}
          <div className="col-span-3 space-y-3">
            <div className="bg-pcis-card/40 border border-pcis-border/50 rounded-lg p-4" style={anim(reveal, 4)}>
              <div className="text-[9px] uppercase tracking-[0.2em] text-pcis-text-muted/60 mb-3">All Matches</div>
              {allMatches.map((m, i) => {
                const c = getClient(m.clientId)
                const p = getProperty(m.propertyId)
                return (
                  <div key={i} className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] font-medium w-6 ${m.grade.startsWith('A') ? 'text-pcis-gold/80' : 'text-white/40'}`}>{m.grade}</span>
                    <span className="text-[10px] text-white/60 truncate flex-1">{c?.name}</span>
                    <span className="text-[9px] text-pcis-text-muted/40">{p?.type}</span>
                  </div>
                )
              })}
            </div>
            <div className="bg-pcis-card/40 border border-pcis-border/50 rounded-lg p-4" style={anim(reveal, 5)}>
              <div className="text-[9px] uppercase tracking-[0.2em] text-pcis-text-muted/60 mb-2">Grade Distribution</div>
              {['A+', 'A', 'B+', 'B'].map((grade, i) => {
                const count = matches.filter(m => m.grade === grade).length
                if (count === 0) return null
                return (
                  <div key={i} className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-pcis-gold/60">{grade}</span>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: count }).map((_, d) => (
                        <div key={d} className="w-2 h-2 rounded-full bg-pcis-gold/30" />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── ACTIONS + PERFORMANCE: actions list + flywheel score + advisor KPIs ──
function ActionsSlide({ active, data }: { active: boolean; data: ReturnType<typeof useBriefData> }) {
  const [reveal, setReveal] = useState(false)
  useEffect(() => { if (active) setTimeout(() => setReveal(true), 100); else setReveal(false) }, [active])
  if (!active) return null

  const perf = data.perf
  const actItems = data.actItems
  const allRecs = data.allRecommendations
  const actCount = allRecs.filter(r => r.urgency === 'Act').length
  const monCount = allRecs.filter(r => r.urgency === 'Monitor').length
  const prepCount = allRecs.filter(r => r.urgency === 'Prepare').length

  return (
    <div className="absolute inset-0 flex items-center justify-center z-20 px-8">
      <div className="w-full max-w-6xl" style={{ opacity: reveal ? 1 : 0, transition: 'opacity 0.6s ease' }}>
        <div className="flex items-center justify-between mb-5">
          <span className="text-[10px] uppercase tracking-[0.4em] text-pcis-gold/40">→ Actions &amp; Performance</span>
          <div className="flex items-center gap-6">
            <div><span className="text-lg text-pcis-gold/80 font-light" style={{ fontFamily: "'Playfair Display', serif" }}>{perf.flyWheelScore}</span><span className="text-[9px] text-pcis-text-muted/50 ml-1.5 uppercase">Flywheel</span></div>
            <div><span className="text-lg text-white/80 font-light" style={{ fontFamily: "'Playfair Display', serif" }}>{Math.round(perf.conversionRate * 100)}%</span><span className="text-[9px] text-pcis-text-muted/50 ml-1.5 uppercase">Conversion</span></div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4">
          {/* Action cards (8 cols) */}
          <div className="col-span-8 space-y-2.5">
            {actItems.slice(0, 5).map((act, i) => {
              const client = getClient(act.clientId)
              const eng = getEngagement(act.clientId)
              return (
                <div key={i} className="bg-pcis-card/45 border border-pcis-gold/8 rounded-lg p-4 flex items-center gap-4" style={anim(reveal, i)}>
                  <div className="w-10 h-10 rounded-full bg-pcis-gold/10 border border-pcis-gold/20 flex items-center justify-center text-xs text-pcis-gold/70 font-medium flex-shrink-0">
                    {client?.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white/85 text-sm font-medium mb-0.5">{act.title}</div>
                    <div className="text-[10px] text-pcis-text-muted">{client?.name} · {client?.type} · {act.category}</div>
                    <div className="text-[10px] text-pcis-text-muted/50 mt-1">{act.description}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <div className="px-2 py-0.5 rounded bg-pcis-gold/12 border border-pcis-gold/15">
                      <span className="text-[9px] uppercase tracking-wider text-pcis-gold/70 font-medium">Act Now</span>
                    </div>
                    {eng && <span className="text-[9px] text-pcis-text-muted/40">score {eng.engagementScore}</span>}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Right panel: performance + recommendation breakdown (4 cols) */}
          <div className="col-span-4 space-y-3">
            {/* Flywheel */}
            <div className="bg-pcis-card/40 border border-pcis-border/50 rounded-lg p-4" style={anim(reveal, 6)}>
              <div className="text-[9px] uppercase tracking-[0.2em] text-pcis-text-muted/60 mb-3">Flywheel KPIs</div>
              {[
                { label: 'Signals Fed', value: perf.signalsFed },
                { label: 'Actions Taken', value: perf.actionsTaken },
                { label: 'Matches Presented', value: perf.matchesPresented },
                { label: 'Reports Generated', value: perf.reportsGenerated },
              ].map((kpi, i) => (
                <div key={i} className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-pcis-text-muted">{kpi.label}</span>
                  <span className="text-sm text-white/70 font-light">{kpi.value}</span>
                </div>
              ))}
              {/* Weekly trend sparkline */}
              <div className="mt-3 pt-2 border-t border-pcis-border/20">
                <div className="text-[8px] uppercase tracking-wider text-pcis-text-muted/40 mb-1.5">7-Day Trend</div>
                <div className="flex items-end gap-1 h-6">
                  {perf.weeklyTrend.map((v, i) => (
                    <div key={i} className="flex-1 rounded-t bg-pcis-gold/30" style={{
                      height: reveal ? `${(v / Math.max(...perf.weeklyTrend)) * 100}%` : '0%',
                      transition: `height 0.6s ease ${0.5 + i * 0.06}s`,
                    }} />
                  ))}
                </div>
              </div>
            </div>

            {/* Recommendation urgency */}
            <div className="bg-pcis-card/40 border border-pcis-border/50 rounded-lg p-4" style={anim(reveal, 7)}>
              <div className="text-[9px] uppercase tracking-[0.2em] text-pcis-text-muted/60 mb-3">Recommendations</div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-red-400/70">Act Now</span>
                <span className="text-sm text-white/70">{actCount}</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-amber-400/70">Monitor</span>
                <span className="text-sm text-white/70">{monCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-green-400/70">Prepare</span>
                <span className="text-sm text-white/70">{prepCount}</span>
              </div>
            </div>

            {/* Alerts acknowledged */}
            <div className="bg-pcis-card/40 border border-pcis-border/50 rounded-lg p-4" style={anim(reveal, 8)}>
              <div className="text-[9px] uppercase tracking-[0.2em] text-pcis-text-muted/60 mb-2">Response Rate</div>
              <div className="text-lg text-white/80 font-light" style={{ fontFamily: "'Playfair Display', serif" }}>
                {perf.recommendationsActedOn}/{perf.recommendationsTotal}
              </div>
              <div className="text-[9px] text-pcis-text-muted/40 mt-0.5">recommendations acted on</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════
// MAIN MORNING BRIEF — STORYTELLING ENGINE
// ════════════════════════════════════════
interface MorningBriefProps {
  onComplete: () => void
}

type SlideType = 'narrate' | 'data'

interface StorySlide {
  type: SlideType
  id: string
  narration?: string[]
  dataComponent?: string  // which data viz to show
}

export default function MorningBrief({ onComplete }: MorningBriefProps) {
  const data = useBriefData()
  const [currentSlide, setCurrentSlide] = useState(0)
  const [speaking, setSpeaking] = useState(0)
  const [fadeOut, setFadeOut] = useState(false)
  const [transPhase, setTransPhase] = useState<'idle' | 'out' | 'in'>('idle')
  const speakRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  // Build story sequence
  const story: StorySlide[] = useMemo(() => {
    const slides: StorySlide[] = []

    const portfolioStr = data.totalPortfolio >= 1e9
      ? `${(data.totalPortfolio / 1e9).toFixed(1)} billion`
      : `${(data.totalPortfolio / 1e6).toFixed(0)} million`

    // 1. Welcome
    slides.push({
      type: 'narrate', id: 'welcome',
      narration: [
        `${greeting}. I'm your PCIS intelligence advisor.`,
        `All four engines are online. Let me walk you through today's intelligence brief.`,
      ],
    })

    // 2. Book health
    slides.push({
      type: 'narrate', id: 'health-intro',
      narration: [
        `Your book holds ${data.bookHealth.total} clients across ${data.tiers.UHNW} ultra-high, ${data.tiers.HNW} high-net-worth, and ${data.tiers.Affluent} affluent profiles.`,
        `Total portfolio under advisory is ${portfolioStr} dollars. Book health sits at ${data.bookHealth.healthPercent}%.`,
        `${data.heating} clients are heating up, ${data.stable} are stable, and ${data.cooling} need attention.`,
      ],
    })
    slides.push({ type: 'data', id: 'health-data', dataComponent: 'bookHealth' })

    // 3. Predictions
    if (data.hotPredictions.length > 0) {
      const topPred = data.hotPredictions[0]
      const topClient = getClient(topPred.clientId)
      const avgConf = Math.round(data.hotPredictions.reduce((s, p) => s + p.confidence, 0) / data.hotPredictions.length)
      slides.push({
        type: 'narrate', id: 'pred-intro',
        narration: [
          `The prediction engine has ${data.allPredictions.length} active patterns, ${data.hotPredictions.length} above 70% confidence.`,
          `Leading signal: ${topClient?.name} shows ${topPred.pattern} at ${topPred.confidence}% confidence.`,
          `Average confidence across hot predictions is ${avgConf}%. Here's the full view.`,
        ],
      })
      slides.push({ type: 'data', id: 'pred-data', dataComponent: 'predictions' })
    }

    // 4. Decay
    if (data.decayAlerts.length > 0) {
      const topDecay = data.decayAlerts[0]
      const decayClient = getClient(topDecay.clientId)
      const coldCount = data.decayAlerts.filter(a => a.status === 'cold' || a.status === 'dormant').length
      const portfolioAtRisk = data.decayAlerts.reduce((sum, a) => {
        const c = getClient(a.clientId)
        return sum + (c?.financialProfile?.portfolioValue || 0)
      }, 0)
      const riskStr = portfolioAtRisk >= 1e9 ? `${(portfolioAtRisk / 1e9).toFixed(1)} billion` : `${(portfolioAtRisk / 1e6).toFixed(0)} million`
      slides.push({
        type: 'narrate', id: 'decay-intro',
        narration: [
          `${data.decayAlerts.length} clients are showing engagement decay, ${coldCount} are in critical status.`,
          `${decayClient?.name} has been silent for ${topDecay.daysSinceContact} days with a ${topDecay.decayRate}% decay rate.`,
          `Combined portfolio at risk is ${riskStr} dollars. Let me show you the breakdown.`,
        ],
      })
      slides.push({ type: 'data', id: 'decay-data', dataComponent: 'decay' })
    }

    // 5. Matches
    if (data.topMatches.length > 0) {
      const topMatch = data.topMatches[0]
      const topMatchClient = getClient(topMatch.clientId)
      const topMatchProp = getProperty(topMatch.propertyId)
      const aGrades = matches.filter(m => m.grade === 'A+' || m.grade === 'A').length
      slides.push({
        type: 'narrate', id: 'match-intro',
        narration: [
          `The match engine produced ${matches.length} property matches, ${aGrades} graded A or higher.`,
          `Top match: ${topMatchClient?.name} paired with ${topMatchProp?.name} at ${Math.round(topMatch.overallScore * 100)}% overall fit.`,
          `Here are the details across all four scoring pillars.`,
        ],
      })
      slides.push({ type: 'data', id: 'match-data', dataComponent: 'matches' })
    }

    // 6. Actions + Performance
    if (data.actItems.length > 0) {
      slides.push({
        type: 'narrate', id: 'action-intro',
        narration: [
          `You have ${data.actItems.length} priority actions requiring immediate attention out of ${data.allRecommendations.length} total recommendations.`,
          `Flywheel score is ${data.perf.flyWheelScore} with a ${Math.round(data.perf.conversionRate * 100)}% conversion rate.`,
          `Here's your action board and performance dashboard.`,
        ],
      })
      slides.push({ type: 'data', id: 'action-data', dataComponent: 'actions' })
    }

    // 7. Closing
    slides.push({
      type: 'narrate', id: 'closing',
      narration: [
        `Your intelligence brief is complete. ${data.recentSignals.length} signals are being processed.`,
        `All four engines — Client, Market, Matching, and Output — are active. Have a productive day.`,
      ],
    })

    return slides
  }, [data, greeting])

  // Speaking engine
  useEffect(() => {
    const slide = story[currentSlide]
    if (!slide || slide.type !== 'narrate' || transPhase !== 'idle') {
      setSpeaking(0)
      return
    }

    let syllableTimer = 0
    let pauseCountdown = 0
    let syllableCount = 0

    speakRef.current = setInterval(() => {
      syllableTimer += 50
      if (pauseCountdown > 0) { pauseCountdown -= 50; setSpeaking(0); return }
      const dur = 120 + Math.random() * 80
      const phase = (syllableTimer % dur) / dur
      const env = Math.sin(phase * Math.PI)
      setSpeaking(0.15 + env * 0.75 + Math.random() * 0.05)
      if (phase > 0.85) {
        syllableCount++
        if (syllableCount > 3 + Math.floor(Math.random() * 4)) {
          pauseCountdown = 200 + Math.random() * 350
          syllableCount = 0
        }
      }
    }, 50)

    return () => { if (speakRef.current) clearInterval(speakRef.current) }
  }, [currentSlide, story, transPhase])

  // advanceSlide via ref to avoid stale closures in timers
  const advanceSlideRef = useRef<() => void>(() => {})

  const advanceSlide = useCallback(() => {
    if (currentSlide >= story.length - 1) {
      setFadeOut(true)
      setTimeout(onComplete, 1500)
      return
    }
    // Phase 1: fade out current (800ms)
    setTransPhase('out')
    setTimeout(() => {
      // Phase 2: swap slide while invisible, then fade in (800ms)
      setCurrentSlide(prev => prev + 1)
      setTransPhase('in')
      setTimeout(() => {
        setTransPhase('idle')
      }, 800)
    }, 800)
  }, [currentSlide, story, onComplete])

  advanceSlideRef.current = advanceSlide

  // Auto-advance data slides after a delay (only when fully visible)
  useEffect(() => {
    const slide = story[currentSlide]
    if (!slide || slide.type !== 'data' || transPhase !== 'idle') return
    const timer = setTimeout(() => advanceSlideRef.current(), 10000)
    return () => clearTimeout(timer)
  }, [currentSlide, story, transPhase])

  const handleSkip = useCallback(() => {
    setFadeOut(true)
    setTimeout(onComplete, 600)
  }, [onComplete])

  const slide = story[currentSlide]

  return (
    <div className="fixed inset-0 z-40" style={{
      background: '#050506',
      opacity: fadeOut ? 0 : 1,
      transition: 'opacity 1s ease',
    }}>
      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, transparent 30%, rgba(5,5,6,0.7) 100%)' }} />

      {/* Grain */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.012 }}>
        <filter id="briefGrain"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves={4} /></filter>
        <rect width="100%" height="100%" filter="url(#briefGrain)" />
      </svg>

      {/* Slide content — cinematic crossfade with scale */}
      <div className="absolute inset-0" style={{
        opacity: transPhase === 'out' ? 0 : transPhase === 'in' ? 1 : 1,
        transform: transPhase === 'out'
          ? 'scale(0.97) translateY(8px)'
          : transPhase === 'in'
            ? 'scale(1) translateY(0)'
            : 'scale(1) translateY(0)',
        transition: transPhase === 'out'
          ? 'opacity 0.8s ease, transform 0.8s ease'
          : transPhase === 'in'
            ? 'opacity 0.8s ease, transform 0.8s cubic-bezier(0.23, 1, 0.32, 1)'
            : 'none',
      }}>
        {/* Narration slides */}
        {slide?.type === 'narrate' && (
          <NarrationSlide
            key={slide.id}
            lines={slide.narration || []}
            speaking={speaking}
            active={transPhase === 'idle'}
            onDone={advanceSlide}
          />
        )}

        {/* Data slides — all receive full data object for comprehensive overviews */}
        {slide?.type === 'data' && slide.dataComponent === 'bookHealth' && (
          <BookHealthSlide active={transPhase !== 'out'} data={data} />
        )}
        {slide?.type === 'data' && slide.dataComponent === 'predictions' && (
          <PredictionsSlide active={transPhase !== 'out'} data={data} />
        )}
        {slide?.type === 'data' && slide.dataComponent === 'decay' && (
          <DecaySlide active={transPhase !== 'out'} data={data} />
        )}
        {slide?.type === 'data' && slide.dataComponent === 'matches' && (
          <MatchesSlide active={transPhase !== 'out'} data={data} />
        )}
        {slide?.type === 'data' && slide.dataComponent === 'actions' && (
          <ActionsSlide active={transPhase !== 'out'} data={data} />
        )}
      </div>

      {/* Bottom bar: progress + skip */}
      <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center z-30">
        {/* Progress dots */}
        <div className="flex items-center gap-1.5 mb-4">
          {story.map((s, i) => (
            <div key={s.id}
              className="rounded-full transition-all duration-500"
              style={{
                width: i === currentSlide ? 20 : s.type === 'data' ? 4 : 6,
                height: s.type === 'data' ? 4 : 6,
                background: i < currentSlide
                  ? 'rgba(201,168,76,0.5)'
                  : i === currentSlide
                    ? 'rgba(201,168,76,0.7)'
                    : 'rgba(255,255,255,0.08)',
              }}
            />
          ))}
        </div>
        <button onClick={handleSkip}
          className="text-[10px] uppercase tracking-[0.3em] text-white/15 hover:text-white/35 transition-colors"
          style={{ fontFamily: "'Inter', sans-serif" }}>
          Skip Brief
        </button>
      </div>
    </div>
  )
}
