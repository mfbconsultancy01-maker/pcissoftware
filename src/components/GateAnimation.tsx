'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'

interface GateAnimationProps {
  onComplete: () => void
  userName?: string
}

export default function GateAnimation({ onComplete, userName = 'Agent' }: GateAnimationProps) {
  const [stage, setStage] = useState(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)
  const stageRef = useRef(0)
  const scanProgressRef = useRef(0)
  const stableComplete = useCallback(onComplete, [])

  useEffect(() => { stageRef.current = stage }, [stage])

  // ── Stage Timeline (identical to HTML) ──
  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), 600),
      setTimeout(() => setStage(2), 2800),
      setTimeout(() => setStage(3), 4000),
      setTimeout(() => setStage(4), 6200),
      setTimeout(() => setStage(5), 7800),
      setTimeout(() => setStage(6), 10000),
      setTimeout(() => stableComplete(), 11200),
    ]
    return () => timers.forEach(clearTimeout)
  }, [stableComplete])

  // Scan progress (stage 3)
  useEffect(() => {
    if (stage === 3) {
      const start = Date.now()
      const duration = 2000
      const tick = () => {
        const p = Math.min((Date.now() - start) / duration, 1)
        scanProgressRef.current = p
        if (p < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }
  }, [stage])

  // ── Particle Canvas (exact same logic as HTML) ──
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let W = window.innerWidth
    let H = window.innerHeight
    canvas.width = W
    canvas.height = H

    const onResize = () => {
      W = window.innerWidth
      H = window.innerHeight
      canvas.width = W
      canvas.height = H
    }
    window.addEventListener('resize', onResize)

    // ── Face geometry (identical to HTML) ──
    const facePoints: { x: number; y: number; group: string }[] = []
    const fcx = 0, fcy = -20

    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2
      facePoints.push({ x: fcx + Math.cos(a) * 95, y: fcy + Math.sin(a) * 120, group: 'outline' })
    }
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2
      facePoints.push({ x: fcx - 34 + Math.cos(a) * 18, y: fcy - 20 + Math.sin(a) * 10, group: 'leftEye' })
    }
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      facePoints.push({ x: fcx - 34 + Math.cos(a) * 7, y: fcy - 20 + Math.sin(a) * 7, group: 'leftIris' })
    }
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2
      facePoints.push({ x: fcx + 34 + Math.cos(a) * 18, y: fcy - 20 + Math.sin(a) * 10, group: 'rightEye' })
    }
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      facePoints.push({ x: fcx + 34 + Math.cos(a) * 7, y: fcy - 20 + Math.sin(a) * 7, group: 'rightIris' })
    }
    for (let i = 0; i < 8; i++) {
      facePoints.push({ x: fcx + (i < 4 ? -3 : 3), y: fcy - 8 + i * 6.5, group: 'nose' })
    }
    for (let i = 0; i < 5; i++) {
      const t = i / 4
      facePoints.push({ x: fcx - 8 + t * 16, y: fcy + 22 + Math.sin(t * Math.PI) * 2, group: 'nose' })
    }
    for (let i = 0; i < 14; i++) {
      const t = i / 13
      facePoints.push({ x: fcx + (t - 0.5) * 50, y: fcy + 48 + Math.sin(t * Math.PI) * -3, group: 'mouth' })
    }
    for (let i = 0; i < 8; i++) {
      const t = i / 7
      facePoints.push({ x: fcx + (t - 0.5) * 36, y: fcy + 54 + Math.sin(t * Math.PI) * 3, group: 'mouth' })
    }
    for (let i = 0; i < 8; i++) {
      const t = i / 7
      facePoints.push({ x: fcx - 72 + t * 25, y: fcy + 8 + t * 20, group: 'cheek' })
      facePoints.push({ x: fcx + 72 - t * 25, y: fcy + 8 + t * 20, group: 'cheek' })
    }
    for (let i = 0; i < 10; i++) {
      const t = i / 9
      facePoints.push({ x: fcx - 55 + t * 38, y: fcy - 42 + Math.sin(t * Math.PI) * -7, group: 'brow' })
      facePoints.push({ x: fcx + 17 + t * 38, y: fcy - 42 + Math.sin(t * Math.PI) * -7, group: 'brow' })
    }
    for (let i = 0; i < 14; i++) {
      const t = i / 13
      const a = Math.PI * 0.12 + t * Math.PI * 0.76
      facePoints.push({ x: fcx + Math.cos(a) * 93, y: fcy + 32 + Math.sin(a) * 85, group: 'jaw' })
    }
    for (let i = 0; i < 6; i++) {
      const t = i / 5
      facePoints.push({ x: fcx - 35 + t * 70, y: fcy - 65, group: 'forehead' })
      facePoints.push({ x: fcx - 30 + t * 60, y: fcy - 75, group: 'forehead' })
    }

    // ── Particles (identical to HTML) ──
    const TOTAL = 250
    const particles: {
      x: number; y: number; z: number
      targetX: number; targetY: number
      vx: number; vy: number
      size: number; origSize: number; alpha: number
      speed: number; phase: number
      isFace: boolean; group: string
    }[] = []

    for (let i = 0; i < TOTAL; i++) {
      const isFace = i < facePoints.length
      const fp = isFace ? facePoints[i] : null
      const size = isFace ? 1.0 + Math.random() * 1.3 : 0.4 + Math.random() * 0.8
      particles.push({
        x: (Math.random() - 0.5) * W * 2,
        y: (Math.random() - 0.5) * H * 2,
        z: Math.random(),
        targetX: fp ? W / 2 + fp.x : (Math.random() - 0.5) * W * 1.5,
        targetY: fp ? H / 2 + fp.y : (Math.random() - 0.5) * H * 1.5,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size, origSize: size, alpha: 0,
        speed: 0.006 + Math.random() * 0.014,
        phase: Math.random() * Math.PI * 2,
        isFace, group: fp?.group || 'ambient',
      })
    }

    let time = 0

    // ── Render (identical to HTML) ──
    const render = () => {
      // Skip rendering when tab is hidden to save CPU
      if (document.hidden) {
        animFrameRef.current = requestAnimationFrame(render)
        return
      }
      time += 0.016
      ctx.clearRect(0, 0, W, H)

      const s = stageRef.current
      const assemble = s >= 1 ? Math.min((s - 0.5) * 0.55, 1) : 0
      const eyeGlow = s >= 2
      const scanning = s === 3
      const recognized = s >= 4
      const receding = s >= 5
      const faded = s >= 6

      for (const p of particles) {
        if (p.isFace && assemble > 0) {
          const dx = p.targetX - p.x, dy = p.targetY - p.y
          const ease = p.speed * assemble * (receding ? 0.2 : 1)
          p.x += dx * ease + Math.sin(time * 1.8 + p.phase) * (receding ? 2 : 0.25)
          p.y += dy * ease + Math.cos(time * 1.5 + p.phase) * (receding ? 2 : 0.25)
          if (receding) {
            p.x += (p.x - W / 2) * 0.004
            p.y += (p.y - H / 2) * 0.003
            p.alpha *= 0.992
          }
        } else {
          p.x += p.vx + Math.sin(time * 0.4 + p.phase) * 0.12
          p.y += p.vy + Math.cos(time * 0.3 + p.phase) * 0.12
          if (p.x < -60) p.x = W + 60
          if (p.x > W + 60) p.x = -60
          if (p.y < -60) p.y = H + 60
          if (p.y > H + 60) p.y = -60
        }

        const tA = p.isFace
          ? assemble * (receding ? 0.15 : (faded ? 0 : 0.85))
          : (faded ? 0 : 0.12 + Math.sin(time + p.phase) * 0.08)
        p.alpha += (tA - p.alpha) * 0.05

        let r = 190, g = 160, b = 90
        const isEye = p.group === 'leftEye' || p.group === 'rightEye'
        const isIris = p.group === 'leftIris' || p.group === 'rightIris'

        if (isIris && eyeGlow) {
          r = 230; g = 205; b = 140
          p.alpha = Math.min(p.alpha * 2, 1)
          p.size = p.origSize * (1.4 + Math.sin(time * 3 + p.phase) * 0.3)
        } else if (isEye && eyeGlow) {
          r = 212; g = 185; b = 120
          p.alpha = Math.min(p.alpha * 1.4, 1)
          p.size = p.origSize * (1.2 + Math.sin(time * 2.5 + p.phase) * 0.2)
        } else if (p.group === 'outline' || p.group === 'jaw') {
          r = 155; g = 140; b = 110
        } else if (p.group === 'brow') {
          r = 175; g = 155; b = 105
        } else if (p.group === 'mouth') {
          r = 170; g = 148; b = 100
        } else if (p.group === 'nose') {
          r = 165; g = 148; b = 108
        } else if (p.group === 'forehead') {
          r = 145; g = 132; b = 102; p.alpha *= 0.4
        } else if (p.group === 'cheek') {
          r = 160; g = 145; b = 108
        } else if (!p.isFace) {
          r = 110; g = 100; b = 75; p.alpha *= 0.45
        }

        if (p.alpha < 0.005) continue

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * (0.8 + p.z * 0.3), 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${r},${g},${b},${p.alpha})`
        ctx.fill()

        if (p.isFace && assemble > 0.4 && !receding && p.alpha > 0.2) {
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${r},${g},${b},${p.alpha * 0.06})`
          ctx.fill()
        }
      }

      // Connection lines
      if (assemble > 0.25 && !faded) {
        const la = receding ? 0.01 : 0.035 * assemble
        ctx.lineWidth = 0.4
        for (let i = 0; i < particles.length; i++) {
          if (!particles[i].isFace) continue
          for (let j = i + 1; j < particles.length; j++) {
            if (!particles[j].isFace) continue
            const dx = particles[i].x - particles[j].x
            const dy = particles[i].y - particles[j].y
            const d = dx * dx + dy * dy
            if (d < 1200) {
              ctx.strokeStyle = `rgba(201,168,76,${(1 - Math.sqrt(d) / 35) * la})`
              ctx.beginPath()
              ctx.moveTo(particles[i].x, particles[i].y)
              ctx.lineTo(particles[j].x, particles[j].y)
              ctx.stroke()
            }
          }
        }
      }

      // Eye iris glow
      if (eyeGlow && !faded) {
        const int = recognized ? 0.55 + Math.sin(time * 1.5) * 0.1 : 0.25 + Math.sin(time * 2) * 0.1
        const eyes: [number, number][] = [[W / 2 - 34, H / 2 - 40], [W / 2 + 34, H / 2 - 40]]
        for (const [ex, ey] of eyes) {
          const g1 = ctx.createRadialGradient(ex, ey, 0, ex, ey, receding ? 10 : 28)
          g1.addColorStop(0, `rgba(220,190,120,${int * (receding ? 0.3 : 1)})`)
          g1.addColorStop(0.3, `rgba(201,168,76,${int * 0.4 * (receding ? 0.3 : 1)})`)
          g1.addColorStop(1, 'rgba(201,168,76,0)')
          ctx.fillStyle = g1
          ctx.beginPath()
          ctx.arc(ex, ey, receding ? 10 : 28, 0, Math.PI * 2)
          ctx.fill()

          if (!receding) {
            ctx.beginPath()
            ctx.arc(ex, ey, 2.5, 0, Math.PI * 2)
            ctx.fillStyle = `rgba(255,240,210,${int * 1.3})`
            ctx.fill()

            ctx.beginPath()
            ctx.arc(ex, ey, 12, 0, Math.PI * 2)
            ctx.strokeStyle = `rgba(201,168,76,${int * 0.15})`
            ctx.lineWidth = 0.6
            ctx.stroke()
          }
        }
      }

      // Scan beam
      if (scanning) {
        const sp = scanProgressRef.current
        const sY = H * 0.22 + sp * H * 0.56

        const sg = ctx.createLinearGradient(0, sY - 60, 0, sY + 60)
        sg.addColorStop(0, 'rgba(201,168,76,0)')
        sg.addColorStop(0.35, 'rgba(201,168,76,0.02)')
        sg.addColorStop(0.5, 'rgba(201,168,76,0.06)')
        sg.addColorStop(0.65, 'rgba(201,168,76,0.02)')
        sg.addColorStop(1, 'rgba(201,168,76,0)')
        ctx.fillStyle = sg
        ctx.fillRect(W * 0.15, sY - 60, W * 0.7, 120)

        ctx.strokeStyle = 'rgba(201,168,76,0.2)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(W * 0.2, sY)
        ctx.lineTo(W * 0.8, sY)
        ctx.stroke()

        for (let i = 0; i < 6; i++) {
          ctx.beginPath()
          ctx.arc(W * 0.2 + Math.random() * W * 0.6, sY + (Math.random() - 0.5) * 4, 1, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(201,168,76,${0.2 + Math.random() * 0.3})`
          ctx.fill()
        }
      }

      animFrameRef.current = requestAnimationFrame(render)
    }

    animFrameRef.current = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(animFrameRef.current)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  // ── Status text ──
  const statusText = useMemo(() => {
    switch (stage) {
      case 1: return { main: 'INITIALIZING', sub: 'Neural pattern assembly' }
      case 2: return { main: 'AI ACTIVE', sub: 'Biometric analysis ready' }
      case 3: return { main: 'SCANNING', sub: 'Identity verification in progress' }
      case 4: return { main: 'IDENTITY VERIFIED', sub: `Welcome back, ${userName}` }
      default: return { main: '', sub: '' }
    }
  }, [stage, userName])

  const hexCorners = [[250,30],[450,145],[450,355],[250,470],[50,355],[50,145]]

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none" style={{ background: '#050506' }}>

      {/* ═══ SKYLINE BG (identical to HTML) ═══ */}
      <div className="absolute inset-0" style={{
        zIndex: 0,
        background: 'linear-gradient(to bottom, #0a0a0c 0%, #0d0c0a 40%, #08080a 100%)',
        opacity: stage >= 5 ? 0.3 : 0.04,
        transition: 'opacity 2s ease',
      }} />
      <div className="absolute inset-0" style={{
        zIndex: 0,
        background: stage >= 5
          ? 'linear-gradient(to bottom, rgba(5,5,6,0.5), rgba(5,5,6,0.3), rgba(5,5,6,0.6))'
          : 'linear-gradient(to bottom, rgba(5,5,6,0.92), rgba(5,5,6,0.85), rgba(5,5,6,0.95))',
        transition: 'background 2s ease',
      }} />

      {/* ═══ PARTICLE CANVAS ═══ */}
      <canvas ref={canvasRef} className="absolute inset-0" style={{ zIndex: 1 }} />

      {/* ═══ HEX FRAME ═══ */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{
        zIndex: 2,
        opacity: stage >= 1 && stage < 5 ? 0.15 : 0,
        transition: 'opacity 1.5s ease',
      }}>
        <svg width="500" height="500" viewBox="0 0 500 500">
          <polygon points="250,30 450,145 450,355 250,470 50,355 50,145"
            fill="none" stroke="rgba(201,168,76,0.2)" strokeWidth="0.5"
            strokeDasharray={stage >= 2 ? '0' : '8,4'}
            style={{ transition: 'stroke-dasharray 0.5s ease' }}
          />
          <polygon points="250,50 430,155 430,345 250,450 70,345 70,155"
            fill="none" stroke="rgba(201,168,76,0.08)" strokeWidth="0.3"
          />
          <g style={{ opacity: stage >= 2 ? 1 : 0, transition: 'opacity 0.5s ease' }}>
            {hexCorners.map(([cx, cy], i) => (
              <circle key={i} cx={cx} cy={cy} r={3} fill="rgba(201,168,76,0.3)" />
            ))}
          </g>
          <circle cx="250" cy="250" r="160" fill="none" stroke="rgba(201,168,76,0.06)"
            strokeWidth="0.5" strokeDasharray="4,8"
            style={{ transformOrigin: 'center', animation: 'rotateRing 20s linear infinite' }}
          />
        </svg>
      </div>

      {/* ═══ STATUS ═══ */}
      <div className="absolute left-1/2 -translate-x-1/2 text-center" style={{
        bottom: '18%', zIndex: 3,
        opacity: stage >= 1 && stage < 5 ? 1 : 0,
        transition: 'opacity 0.8s ease',
      }}>
        <div className="flex items-center justify-center gap-2.5 mb-2">
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: stage >= 4 ? '#4ade80' : stage >= 2 ? '#c9a84c' : '#555',
            boxShadow: stage >= 4
              ? '0 0 12px rgba(74,222,128,0.6), 0 0 24px rgba(74,222,128,0.2)'
              : stage >= 2 ? '0 0 10px rgba(201,168,76,0.4)' : 'none',
            transition: 'all 0.6s ease',
          }} />
          <span style={{
            fontFamily: "'SF Mono', 'Fira Code', 'Courier New', monospace",
            fontSize: 11, letterSpacing: '0.3em',
            color: stage >= 4 ? 'rgba(74,222,128,0.8)' : 'rgba(201,168,76,0.5)',
            transition: 'color 0.5s ease',
          }}>
            {statusText.main}
          </span>
        </div>
        <div style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: 12, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.25)',
        }}>
          {statusText.sub}
        </div>
        {stage === 3 && (
          <div style={{
            width: 200, height: 1, margin: '16px auto 0',
            background: 'rgba(201,168,76,0.1)', borderRadius: 1, overflow: 'hidden',
          }}>
            <ScanFill />
          </div>
        )}
      </div>

      {/* ═══ WELCOME SCREEN ═══ */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{
        zIndex: 4,
        opacity: stage >= 5 && stage < 7 ? 1 : 0,
        transform: stage >= 5 ? 'translateY(0)' : 'translateY(24px)',
        transition: 'all 1.2s cubic-bezier(0.23, 1, 0.32, 1)',
      }}>
        <div className="text-center">
          <div style={{
            width: 56, height: 56, margin: '0 auto 28px',
            border: '1px solid rgba(201,168,76,0.25)', borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(201,168,76,0.03)', boxShadow: '0 0 40px rgba(201,168,76,0.06)',
            opacity: 0, animation: stage >= 5 ? 'fadeUp 0.8s ease 0.2s forwards' : 'none',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" stroke="#c9a84c" strokeWidth="1" fill="none" />
              <path d="M12 6L6 9.5v7L12 20l6-3.5v-7L12 6z" stroke="#c9a84c" strokeWidth="0.6" fill="rgba(201,168,76,0.04)" />
              <circle cx="12" cy="13" r="1.5" fill="#c9a84c" opacity="0.7" />
            </svg>
          </div>
          <div style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 40, fontWeight: 400, color: 'white', letterSpacing: '0.04em',
            opacity: 0, animation: stage >= 5 ? 'fadeUp 0.8s ease 0.5s forwards' : 'none',
          }}>
            Welcome Back
          </div>
          <div style={{
            width: 50, height: 1, margin: '20px auto',
            background: 'linear-gradient(to right, transparent, rgba(201,168,76,0.5), transparent)',
            opacity: 0, animation: stage >= 5 ? 'fadeUp 0.7s ease 0.7s forwards' : 'none',
          }} />
          <div style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: 14, letterSpacing: '0.5em', textTransform: 'uppercase' as const,
            color: 'rgba(201,168,76,0.45)',
            opacity: 0, animation: stage >= 5 ? 'fadeUp 0.8s ease 0.9s forwards' : 'none',
          }}>
            Advisor Intelligence
          </div>
          <div style={{
            fontSize: 15, fontWeight: 300, color: 'rgba(255,255,255,0.55)', marginTop: 40,
            opacity: 0, animation: stage >= 5 ? 'fadeUp 0.8s ease 1.1s forwards' : 'none',
          }}>
            Authenticated as{' '}
            <span style={{ color: 'rgba(212,185,120,0.9)', fontWeight: 400 }}>{userName}</span>
          </div>
          <div style={{
            marginTop: 44, opacity: 0,
            animation: stage >= 5 ? 'fadeUp 0.8s ease 1.4s forwards' : 'none',
          }}>
            <div style={{
              width: 100, height: 1, margin: '0 auto',
              background: 'rgba(201,168,76,0.08)', borderRadius: 1, overflow: 'hidden',
            }}>
              <div style={{
                width: '100%', height: '100%', background: 'rgba(201,168,76,0.5)',
                transform: 'translateX(-100%)',
                animation: stage >= 5 ? 'progressBar 1.5s ease-out 1.6s forwards' : 'none',
              }} />
            </div>
            <div style={{
              fontFamily: "'SF Mono', 'Fira Code', 'Courier New', monospace",
              fontSize: 8, letterSpacing: '0.4em', color: 'rgba(201,168,76,0.2)', marginTop: 10,
            }}>
              ENTERING SECURE ENVIRONMENT
            </div>
          </div>
        </div>
      </div>

      {/* ═══ FINAL FADE ═══ */}
      <div className="absolute inset-0 pointer-events-none" style={{
        zIndex: 5, background: '#050506',
        opacity: stage >= 6 ? 1 : 0, transition: 'opacity 1s ease-in',
      }} />

      {/* ═══ VIGNETTE ═══ */}
      <div className="absolute inset-0 pointer-events-none" style={{
        zIndex: 6,
        background: 'radial-gradient(ellipse at center, transparent 40%, rgba(5,5,6,0.5) 100%)',
      }} />

      {/* ═══ GRAIN ═══ */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 6, opacity: 0.02 }}>
        <filter id="gateGrain">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves={4} />
        </filter>
        <rect width="100%" height="100%" filter="url(#gateGrain)" />
      </svg>

      <style jsx>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes progressBar {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        @keyframes rotateRing {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

function ScanFill() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const start = Date.now()
    const tick = () => {
      const p = Math.min((Date.now() - start) / 2000, 1)
      if (ref.current) ref.current.style.width = `${p * 100}%`
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [])
  return (
    <div ref={ref} style={{
      width: '0%', height: '100%', background: 'rgba(201,168,76,0.6)',
      transition: 'width 0.08s linear',
    }} />
  )
}