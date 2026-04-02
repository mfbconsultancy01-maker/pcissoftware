'use client'

import { useEffect, useRef } from 'react'

interface AIBriefOrbProps {
  speakingAmplitude: number
  size?: number
  visible: boolean
  compact?: boolean
}

export default function AIBriefOrb({
  speakingAmplitude,
  size = 180,
  visible,
  compact = false,
}: AIBriefOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)
  const ampRef = useRef(0)
  const visRef = useRef(false)
  const renderRef = useRef<(() => void) | null>(null)

  useEffect(() => { ampRef.current = speakingAmplitude }, [speakingAmplitude])
  useEffect(() => {
    const wasVisible = visRef.current
    visRef.current = visible
    if (visible && !wasVisible && !animFrameRef.current && renderRef.current) {
      animFrameRef.current = requestAnimationFrame(renderRef.current)
    }
  }, [visible])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const W = compact ? 80 : size
    const H = compact ? 80 : size
    canvas.width = W * dpr
    canvas.height = H * dpr
    canvas.style.width = `${W}px`
    canvas.style.height = `${H}px`
    ctx.scale(dpr, dpr)

    const cx = W / 2
    const cy = H / 2
    const baseR = compact ? 28 : size * 0.36

    // ═══════════════════════════════════
    // SPHERE PARTICLES — fibonacci lattice
    // ═══════════════════════════════════
    const N = compact ? 80 : 220
    const golden = (1 + Math.sqrt(5)) / 2

    interface P {
      // spherical base position
      theta: number; phi: number
      // current 2D projected position
      x: number; y: number
      sz: number; a: number
      // for orbiting
      orbitSpeed: number
      orbitOffset: number
      layer: number // 0 = core, 1 = mid, 2 = outer
    }

    const particles: P[] = []
    for (let i = 0; i < N; i++) {
      const t = i / N
      const theta = Math.acos(1 - 2 * (i + 0.5) / N) // polar angle
      const phi = 2 * Math.PI * i / golden  // azimuthal angle

      const layer = t < 0.2 ? 0 : t < 0.65 ? 1 : 2

      particles.push({
        theta, phi,
        x: cx, y: cy,
        sz: layer === 0 ? 1.0 + Math.random() * 0.6
           : layer === 1 ? 0.7 + Math.random() * 0.5
           : 0.35 + Math.random() * 0.35,
        a: 0,
        orbitSpeed: 0.15 + Math.random() * 0.25,
        orbitOffset: Math.random() * Math.PI * 2,
        layer,
      })
    }

    // Orbital ring particles (2 rings)
    const RING_PTS = compact ? 0 : 48
    interface RingP { angle: number; r: number; speed: number; sz: number; a: number; x: number; y: number; ringIdx: number }
    const ringParticles: RingP[] = []
    for (let ring = 0; ring < 2; ring++) {
      const count = RING_PTS
      const ringR = baseR * (1.3 + ring * 0.25)
      for (let i = 0; i < count; i++) {
        ringParticles.push({
          angle: (i / count) * Math.PI * 2,
          r: ringR,
          speed: (ring === 0 ? 0.18 : -0.12),
          sz: 0.3 + Math.random() * 0.2,
          a: 0, x: cx, y: cy,
          ringIdx: ring,
        })
      }
    }

    let time = 0
    let smoothAmp = 0

    const render = () => {
      time += 0.016
      ctx.clearRect(0, 0, W, H)
      renderRef.current = render
      if (!visRef.current || document.hidden) {
        // Stop the loop entirely when not visible — saves CPU
        animFrameRef.current = 0
        return
      }

      smoothAmp += (ampRef.current - smoothAmp) * 0.14

      // Dynamic radius — pulses with speech
      const pulseR = baseR * (1 + smoothAmp * 0.12 + Math.sin(time * 1.5) * 0.015)

      // ── LAYERED GLOW ──
      // Deep inner glow
      const g0 = ctx.createRadialGradient(cx, cy, 0, cx, cy, pulseR * 2.5)
      g0.addColorStop(0, `rgba(212,165,116,${0.08 + smoothAmp * 0.06})`)
      g0.addColorStop(0.3, `rgba(201,168,76,${0.03 + smoothAmp * 0.03})`)
      g0.addColorStop(0.6, `rgba(180,150,80,${0.008 + smoothAmp * 0.01})`)
      g0.addColorStop(1, 'rgba(160,140,70,0)')
      ctx.fillStyle = g0
      ctx.beginPath(); ctx.arc(cx, cy, pulseR * 2.5, 0, Math.PI * 2); ctx.fill()

      // Core bright glow
      const g1 = ctx.createRadialGradient(cx, cy, 0, cx, cy, pulseR * 0.5)
      g1.addColorStop(0, `rgba(255,235,190,${0.12 + smoothAmp * 0.1})`)
      g1.addColorStop(0.5, `rgba(230,200,140,${0.04 + smoothAmp * 0.04})`)
      g1.addColorStop(1, 'rgba(201,168,76,0)')
      ctx.fillStyle = g1
      ctx.beginPath(); ctx.arc(cx, cy, pulseR * 0.5, 0, Math.PI * 2); ctx.fill()

      // ── SPHERE PARTICLES ──
      // Compute 3D rotation
      const rotY = time * 0.2 // slow Y rotation
      const rotX = Math.sin(time * 0.13) * 0.15 // gentle tilt

      const cosRY = Math.cos(rotY), sinRY = Math.sin(rotY)
      const cosRX = Math.cos(rotX), sinRX = Math.sin(rotX)

      // Sort by depth for proper rendering
      const projected: { x: number; y: number; z: number; sz: number; layer: number; idx: number }[] = []

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        // Sphere position with speech distortion
        const layerR = p.layer === 0 ? pulseR * 0.35
          : p.layer === 1 ? pulseR * (0.7 + smoothAmp * 0.08)
          : pulseR * (1.0 + smoothAmp * 0.15)

        // Add organic movement
        const breathe = Math.sin(time * 0.8 + p.orbitOffset) * 0.04
        const speakPush = p.layer === 2 ? smoothAmp * Math.sin(time * 6 + p.orbitOffset) * 0.06 : 0
        const r = layerR * (1 + breathe + speakPush)

        // Orbiting: shift phi over time
        const phi = p.phi + time * p.orbitSpeed

        // 3D position
        let x3 = r * Math.sin(p.theta) * Math.cos(phi)
        let y3 = r * Math.sin(p.theta) * Math.sin(phi)
        let z3 = r * Math.cos(p.theta)

        // Rotate Y
        const x3r = x3 * cosRY - z3 * sinRY
        const z3r = x3 * sinRY + z3 * cosRY
        // Rotate X
        const y3r = y3 * cosRX - z3r * sinRX
        const z3f = y3 * sinRX + z3r * cosRX

        projected.push({
          x: cx + x3r,
          y: cy + y3r,
          z: z3f,
          sz: p.sz,
          layer: p.layer,
          idx: i,
        })
      }

      // Sort back-to-front
      projected.sort((a, b) => a.z - b.z)

      // Draw connections first (between nearby particles)
      if (!compact) {
        const maxDist = baseR * 0.45
        const maxD2 = maxDist * maxDist
        ctx.lineWidth = 0.3
        for (let i = 0; i < projected.length; i++) {
          const pi = projected[i]
          if (pi.layer === 0) continue // skip core for perf
          for (let j = i + 1; j < projected.length; j++) {
            const pj = projected[j]
            if (pj.layer === 0) continue
            const dx = pi.x - pj.x, dy = pi.y - pj.y
            const d2 = dx * dx + dy * dy
            if (d2 < maxD2) {
              const depthFade = Math.min(1, (pi.z + baseR) / (baseR * 2)) * Math.min(1, (pj.z + baseR) / (baseR * 2))
              const distFade = 1 - Math.sqrt(d2) / maxDist
              const alpha = distFade * depthFade * (0.04 + smoothAmp * 0.03)
              if (alpha > 0.003) {
                ctx.strokeStyle = `rgba(201,168,76,${alpha})`
                ctx.beginPath(); ctx.moveTo(pi.x, pi.y); ctx.lineTo(pj.x, pj.y); ctx.stroke()
              }
            }
          }
        }
      }

      // Draw particles
      for (const p of projected) {
        // Depth-based alpha and size
        const depthNorm = (p.z + pulseR) / (pulseR * 2) // 0 = back, 1 = front
        const depthAlpha = 0.15 + depthNorm * 0.85
        const depthSize = 0.6 + depthNorm * 0.4

        // Color by layer
        let r: number, g: number, b: number, baseAlpha: number
        if (p.layer === 0) {
          r = 255; g = 235; b = 190; baseAlpha = 0.6 + smoothAmp * 0.3
        } else if (p.layer === 1) {
          r = 212; g = 175; b = 116; baseAlpha = 0.45 + smoothAmp * 0.2
        } else {
          r = 190; g = 158; b = 95; baseAlpha = 0.3 + smoothAmp * 0.15
        }

        const finalAlpha = baseAlpha * depthAlpha
        const finalSize = p.sz * depthSize * (1 + smoothAmp * (p.layer === 2 ? 0.3 : 0.1))

        if (finalAlpha < 0.01) continue
        ctx.beginPath()
        ctx.arc(p.x, p.y, finalSize, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${r},${g},${b},${finalAlpha})`
        ctx.fill()

        // Soft glow on brighter particles
        if (finalAlpha > 0.3 && p.layer <= 1) {
          ctx.beginPath()
          ctx.arc(p.x, p.y, finalSize * 3, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${r},${g},${b},${finalAlpha * 0.04})`
          ctx.fill()
        }
      }

      // ── ORBITAL RINGS ──
      for (const rp of ringParticles) {
        rp.angle += rp.speed * 0.016
        const wobble = Math.sin(time * 0.5 + rp.angle * 3) * 2
        rp.x = cx + Math.cos(rp.angle) * rp.r
        rp.y = cy + Math.sin(rp.angle) * (rp.r * 0.3 + wobble) // flattened ellipse
        rp.a = 0.08 + Math.sin(rp.angle * 2 + time) * 0.04 + smoothAmp * 0.06
        ctx.beginPath(); ctx.arc(rp.x, rp.y, rp.sz, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(201,168,76,${rp.a})`; ctx.fill()
      }

      // ── RING PATHS (subtle) ──
      if (!compact) {
        for (let ring = 0; ring < 2; ring++) {
          const ringR = baseR * (1.3 + ring * 0.25)
          ctx.beginPath()
          ctx.ellipse(cx, cy, ringR, ringR * 0.3 + Math.sin(time * 0.5) * 2, 0, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(201,168,76,${0.025 + smoothAmp * 0.015})`
          ctx.lineWidth = 0.3
          ctx.setLineDash([1.5, 4])
          ctx.stroke()
          ctx.setLineDash([])
        }
      }

      // ── CENTER BRIGHT DOT ──
      const coreSize = (compact ? 2 : 3) + smoothAmp * 1.5
      const coreGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreSize * 4)
      coreGlow.addColorStop(0, `rgba(255,245,220,${0.4 + smoothAmp * 0.3})`)
      coreGlow.addColorStop(0.3, `rgba(230,200,140,${0.15 + smoothAmp * 0.1})`)
      coreGlow.addColorStop(1, 'rgba(201,168,76,0)')
      ctx.fillStyle = coreGlow
      ctx.beginPath(); ctx.arc(cx, cy, coreSize * 4, 0, Math.PI * 2); ctx.fill()

      animFrameRef.current = requestAnimationFrame(render)
    }

    renderRef.current = render

    const startLoop = () => {
      if (!animFrameRef.current && renderRef.current) {
        animFrameRef.current = requestAnimationFrame(renderRef.current)
      }
    }

    const onVisChange = () => { if (!document.hidden && visRef.current) startLoop() }
    document.addEventListener('visibilitychange', onVisChange)

    startLoop()
    return () => {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = 0
      renderRef.current = null
      document.removeEventListener('visibilitychange', onVisChange)
    }
  }, [size, compact])

  return <canvas ref={canvasRef} style={{ opacity: visible ? 1 : 0, transition: 'opacity 1s ease', pointerEvents: 'none' }} />
}
