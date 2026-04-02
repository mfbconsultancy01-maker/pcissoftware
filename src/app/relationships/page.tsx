'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { escapeHtml } from '@/lib/sanitize'
import type * as MaplibreGL from 'maplibre-gl'
import {
  brokerContacts, sharedDeals,
  getBrokerContact, getContactInteractions, getContactDeals,
  getBrokerNetworkStats, getClient,
  type BrokerContact, type BrokerContactRole,
  type RelationshipTier, type MomentumDirection,
  BROKER_CONTACT_ROLES, brokerContactRoleColors,
} from '@/lib/mockData'

// ============================================================
// UTILITIES
// ============================================================

function strengthColor(s: number): string {
  if (s >= 80) return '#22c55e'
  if (s >= 60) return '#d4a574'
  if (s >= 40) return '#f59e0b'
  return '#ef4444'
}

function tierLabel(t: RelationshipTier): string {
  if (t === 'inner') return 'Inner Circle'
  if (t === 'middle') return 'Mid Tier'
  return 'Outer Ring'
}

function momentumArrow(m: MomentumDirection): string {
  if (m === 'heating') return '↑'
  if (m === 'cooling') return '↓'
  return '→'
}

function momentumColor(m: MomentumDirection): string {
  if (m === 'heating') return '#22c55e'
  if (m === 'cooling') return '#3b82f6'
  return '#6b7280'
}

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatAED(n: number): string {
  if (n >= 1_000_000) return `AED ${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `AED ${(n / 1_000).toFixed(0)}K`
  return `AED ${n}`
}

const interactionTypeIcons: Record<string, string> = {
  'Call': '✆', 'Meeting': '◆', 'WhatsApp': '◈', 'Email': '✉',
  'Deal Closed': '★', 'Referral Received': '↙', 'Referral Sent': '↗', 'Co-Listing': '⬡',
}

// Dubai coordinates
const DUBAI_LAT = 25.2
const DUBAI_LON = 55.27

// (3D Globe removed  - replaced by full-page MapLibre GL network map)

// Global coordinates for each contact based on their company HQ / primary market
// Some contacts operate internationally, others are Dubai-local
const CONTACT_GLOBAL_COORDS: Record<string, { lat: number; lon: number; city: string; country: string }> = {
  'bc1':  { lat: 25.08, lon: 55.14, city: 'Dubai', country: 'UAE' },          // Rashid - Knight Frank Dubai
  'bc2':  { lat: 24.86, lon: 67.00, city: 'Karachi', country: 'Pakistan' },   // Nadia - Habib Bank WM
  'bc3':  { lat: 25.20, lon: 55.27, city: 'Dubai', country: 'UAE' },          // Omar - Emaar
  'bc4':  { lat: 25.21, lon: 55.28, city: 'Dubai', country: 'UAE' },          // Sarah - Al Tamimi DIFC
  'bc5':  { lat: 25.08, lon: 55.14, city: 'Dubai', country: 'UAE' },          // Ahmed - Betterhomes
  'bc6':  { lat: 25.16, lon: 55.24, city: 'Dubai', country: 'UAE' },          // Layla - Studio LF
  'bc7':  { lat: 51.51, lon: -0.13, city: 'London', country: 'UK' },          // James - HSBC PB
  'bc8':  { lat: 19.08, lon: 72.88, city: 'Mumbai', country: 'India' },       // Priya - Savills
  'bc9':  { lat: 55.76, lon: 37.62, city: 'Moscow', country: 'Russia' },      // Viktor - Luxhabitat
  'bc10': { lat: 25.19, lon: 55.26, city: 'Dubai', country: 'UAE' },          // Fatima - DAMAC
  'bc11': { lat: 25.20, lon: 55.27, city: 'Dubai', country: 'UAE' },          // Daniel - Emirates NBD
  'bc12': { lat: 51.51, lon: -0.13, city: 'London', country: 'UK' },          // Aisha - Henley & Partners
}


// (Old flat WorldMap removed  - replaced by FullWorldMap with MapLibre GL)

// ============================================================
// FULL-PAGE WORLD MAP  - Ultra-realistic zoomable satellite map
// Uses MapLibre GL + CartoDB Dark Matter tiles
// ============================================================

function FullWorldMap({
  selectedContactId,
  onSelectContact,
  roleFilter,
  isVisible,
}: {
  selectedContactId: string | null
  onSelectContact: (id: string) => void
  roleFilter: BrokerContactRole | 'all'
  isVisible: boolean
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MaplibreGL.Map | null>(null)
  const markersRef = useRef<MaplibreGL.Marker[]>([])
  const mlRef = useRef<typeof MaplibreGL | null>(null)
  const animFrameRef = useRef(0)
  const arcCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const initStartedRef = useRef(false) // Guard against React Strict Mode double-mount
  const [mapReady, setMapReady] = useState(false)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // Keep refs in sync for the animation loop (avoids re-creating useEffect)
  const selectedRef = useRef(selectedContactId)
  const hoveredRef = useRef(hoveredId)
  selectedRef.current = selectedContactId
  hoveredRef.current = hoveredId

  const contacts = useMemo(() => {
    const filtered = roleFilter === 'all'
      ? brokerContacts
      : brokerContacts.filter(c => c.role === roleFilter)
    return filtered.map(contact => {
      const geo = CONTACT_GLOBAL_COORDS[contact.id] || { lat: DUBAI_LAT, lon: DUBAI_LON, city: 'Dubai', country: 'UAE' }
      return { contact, ...geo }
    })
  }, [roleFilter])

  // Initialize MapLibre GL only when the component becomes visible.
  // MapLibre needs a container with real pixel dimensions to create WebGL context.
  // See: https://github.com/maplibre/maplibre-gl-js/issues/1363
  useEffect(() => {
    if (!isVisible || !mapContainerRef.current) return

    // If map already exists and is healthy, just resize and signal ready
    if (mapRef.current) {
      try {
        mapRef.current.resize()
        setMapReady(true)
      } catch (_) {
        mapRef.current = null
      }
      if (mapRef.current) return
    }

    if (initStartedRef.current) return
    initStartedRef.current = true
    let cancelled = false

    async function init() {
      console.log('[PCIS Map] Starting init, container:', mapContainerRef.current?.offsetWidth, 'x', mapContainerRef.current?.offsetHeight)
      const mlModule = await import('maplibre-gl')
      console.log('[PCIS Map] Module loaded, keys:', Object.keys(mlModule).slice(0, 5), 'has default:', !!(mlModule as any).default, 'has Map:', !!(mlModule as any).Map)
      // v5+ has no .default  - Map, Marker etc. are named exports
      // Webpack may or may not wrap in .default depending on version
      const ml = (mlModule as any).default || mlModule
      console.log('[PCIS Map] Using ml, typeof Map:', typeof ml.Map)
      if (typeof ml.Map !== 'function') {
        console.error('[PCIS Map] FATAL: ml.Map is not a function! Module structure:', Object.keys(mlModule))
        initStartedRef.current = false
        return
      }
      // Inject critical MapLibre CSS directly (avoids CDN load failures)
      if (!document.querySelector('style[data-maplibre]')) {
        const style = document.createElement('style')
        style.setAttribute('data-maplibre', 'true')
        style.textContent = `
          .maplibregl-map{font:12px/20px Helvetica Neue,Arial,Helvetica,sans-serif;overflow:hidden;position:relative;-webkit-tap-highlight-color:rgba(0,0,0,0)}
          .maplibregl-canvas{left:0;position:absolute;top:0}
          .maplibregl-map:fullscreen{height:100%;width:100%}
          .maplibregl-canvas-container.maplibregl-interactive{cursor:grab;-webkit-user-select:none;user-select:none}
          .maplibregl-canvas-container.maplibregl-interactive:active{cursor:grabbing}
          .maplibregl-canvas-container.maplibregl-touch-zoom-rotate .maplibregl-canvas{touch-action:pan-x pan-y}
          .maplibregl-ctrl-bottom-left,.maplibregl-ctrl-bottom-right,.maplibregl-ctrl-top-left,.maplibregl-ctrl-top-right{pointer-events:none;position:absolute;z-index:2}
          .maplibregl-ctrl-top-left{left:0;top:0}.maplibregl-ctrl-top-right{right:0;top:0}
          .maplibregl-ctrl-bottom-left{bottom:0;left:0}.maplibregl-ctrl-bottom-right{bottom:0;right:0}
          .maplibregl-ctrl{clear:both;pointer-events:auto;transform:translate(0)}
          .maplibregl-ctrl-top-left .maplibregl-ctrl{float:left;margin:10px 0 0 10px}
          .maplibregl-ctrl-top-right .maplibregl-ctrl{float:right;margin:10px 10px 0 0}
          .maplibregl-ctrl-bottom-left .maplibregl-ctrl{float:left;margin:0 0 10px 10px}
          .maplibregl-ctrl-bottom-right .maplibregl-ctrl{float:right;margin:0 10px 10px 0}
          .maplibregl-ctrl-group{background:#fff;border-radius:4px;box-shadow:0 0 0 2px rgba(0,0,0,.1)}
          .maplibregl-ctrl-group button{background-color:transparent;border:0;box-sizing:border-box;cursor:pointer;display:block;height:29px;outline:none;overflow:hidden;padding:0;width:29px}
          .maplibregl-ctrl-group button+button{border-top:1px solid #ddd}
          .maplibregl-ctrl-attrib{background-color:hsla(0,0%,100%,.5);margin:0;padding:0 5px}
          .maplibregl-ctrl-attrib a{color:rgba(0,0,0,.75);text-decoration:none;font-size:12px}
          .maplibregl-ctrl button .maplibregl-ctrl-icon{background-position:50%;background-repeat:no-repeat;display:block;height:100%;width:100%}
          .maplibregl-ctrl-icon .maplibregl-ctrl-zoom-in{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='%23333' viewBox='0 0 29 29'%3E%3Cpath d='M14.5 8.5c-.75 0-1.5.75-1.5 1.5v3h-3c-.75 0-1.5.75-1.5 1.5S9.25 16 10 16h3v3c0 .75.75 1.5 1.5 1.5S16 19.75 16 19v-3h3c.75 0 1.5-.75 1.5-1.5S19.75 13 19 13h-3v-3c0-.75-.75-1.5-1.5-1.5z'/%3E%3C/svg%3E")}
          .maplibregl-marker{position:absolute;top:0;left:0;will-change:transform}
        `
        document.head.appendChild(style)
      }
      // Also try to load the full CSS from CDN (non-blocking, for controls styling)
      if (!document.querySelector('link[href*="maplibre-gl"]')) {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/maplibre-gl@latest/dist/maplibre-gl.css'
        document.head.appendChild(link)
      }
      if (cancelled || !mapContainerRef.current) { initStartedRef.current = false; return }
      console.log('[PCIS Map] CSS loaded, container dims:', mapContainerRef.current.offsetWidth, 'x', mapContainerRef.current.offsetHeight)
      mlRef.current = ml

      // Clear container in case Strict Mode left stale children
      while (mapContainerRef.current.firstChild) {
        mapContainerRef.current.removeChild(mapContainerRef.current.firstChild)
      }

      const map = new ml.Map({
        container: mapContainerRef.current,
        style: {
          version: 8 as const,
          sources: {
            'carto-dark': {
              type: 'raster' as const,
              tiles: [
                'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
                'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
                'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
              ],
              tileSize: 256,
              attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
              maxzoom: 20,
            },
          },
          layers: [
            {
              id: 'carto-dark-layer',
              type: 'raster' as const,
              source: 'carto-dark',
              minzoom: 0,
              maxzoom: 20,
            },
          ],
        },
        center: [45, 25],
        zoom: 3,
        minZoom: 2,
        maxZoom: 18,
        pitch: 0,
        bearing: 0,
        attributionControl: false,
      })

      map.addControl(new ml.NavigationControl({
        showCompass: true,
        showZoom: true,
        visualizePitch: true,
      }), 'bottom-right')

      map.addControl(new ml.AttributionControl({
        compact: true,
      }), 'bottom-left')

      console.log('[PCIS Map] Map instance created, waiting for load event...')

      map.on('error', (e: any) => {
        console.error('[PCIS Map] Map error:', e.error?.message || e)
      })

      map.on('load', () => {
        console.log('[PCIS Map] Map loaded successfully!')
        if (cancelled) {
          map.remove()
          initStartedRef.current = false
          return
        }
        mapRef.current = map
        // Force resize after load to ensure tiles render at correct dimensions
        map.resize()
        setMapReady(true)
      })
    }
    init()

    return () => {
      cancelled = true
      cancelAnimationFrame(animFrameRef.current)
      if (arcCanvasRef.current?.parentElement) {
        arcCanvasRef.current.parentElement.removeChild(arcCanvasRef.current)
        arcCanvasRef.current = null
      }
      markersRef.current.forEach(m => m.remove())
      markersRef.current = []
      setMapReady(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible])

  // Add/update markers and arcs when data or selection changes
  useEffect(() => {
    const map = mapRef.current
    const ml = mlRef.current
    if (!map || !ml || !mapReady) return

    // Clean previous markers
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    const dubaiCoords = { lat: DUBAI_LAT, lon: DUBAI_LON }

    // ---- Dubai HQ marker ----
    const hqEl = document.createElement('div')
    hqEl.innerHTML = `
      <div style="position:relative;width:60px;height:60px;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;inset:0;border-radius:50%;border:2px solid rgba(212,165,116,0.3);animation:pcis-pulse 2s ease-in-out infinite;"></div>
        <div style="position:absolute;inset:8px;border-radius:50%;border:1.5px solid rgba(212,165,116,0.2);animation:pcis-pulse 2s ease-in-out infinite 0.3s;"></div>
        <div style="position:absolute;inset:16px;border-radius:50%;border:1px solid rgba(212,165,116,0.15);animation:pcis-pulse 2s ease-in-out infinite 0.6s;"></div>
        <div style="width:14px;height:14px;border-radius:50%;background:radial-gradient(circle,#d4a574 0%,#b8895a 60%,#8a6540 100%);box-shadow:0 0 20px rgba(212,165,116,0.5),0 0 40px rgba(212,165,116,0.2);border:2px solid rgba(255,255,255,0.3);"></div>
      </div>
    `
    const hqMarker = new ml.Marker({ element: hqEl, anchor: 'center' })
      .setLngLat([dubaiCoords.lon, dubaiCoords.lat])
      .addTo(map)
    markersRef.current.push(hqMarker)

    // Dubai HQ label
    const hqLabel = document.createElement('div')
    hqLabel.innerHTML = `
      <div style="background:rgba(10,10,10,0.85);backdrop-filter:blur(8px);border:1px solid rgba(212,165,116,0.3);border-radius:8px;padding:6px 12px;pointer-events:none;white-space:nowrap;">
        <div style="font:bold 11px Inter,system-ui,sans-serif;color:#d4a574;letter-spacing:0.5px;">DUBAI HQ</div>
        <div style="font:9px Inter,system-ui,sans-serif;color:rgba(255,255,255,0.4);margin-top:2px;">Network Hub · ${contacts.length} contacts</div>
      </div>
    `
    const hqLabelMarker = new ml.Marker({ element: hqLabel, anchor: 'left', offset: [20, 0] })
      .setLngLat([dubaiCoords.lon, dubaiCoords.lat])
      .addTo(map)
    markersRef.current.push(hqLabelMarker)

    // ---- Contact markers ----
    contacts.forEach(({ contact, lat, lon, city, country }) => {
      const isSelected = contact.id === selectedContactId
      const roleColor = brokerContactRoleColors[contact.role]
      const sColor = strengthColor(contact.relationshipStrength)
      const geo = CONTACT_GLOBAL_COORDS[contact.id]
      const isInternational = geo && geo.city !== 'Dubai'
      const size = isSelected ? 42 : 34

      const el = document.createElement('div')
      el.style.cursor = 'pointer'
      el.style.zIndex = isSelected ? '10' : '5'
      el.innerHTML = `
        <div style="position:relative;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;">
          ${isSelected ? `<div style="position:absolute;inset:-8px;border-radius:50%;background:radial-gradient(circle,${roleColor}20 0%,transparent 70%);"></div>` : ''}
          <svg viewBox="0 0 36 36" width="${size}" height="${size}" style="position:absolute;inset:0;transform:rotate(-90deg);">
            <circle cx="18" cy="18" r="15" fill="rgba(10,10,10,0.9)" stroke="rgba(255,255,255,0.06)" stroke-width="2"/>
            <circle cx="18" cy="18" r="15" fill="none" stroke="${sColor}" stroke-width="${isSelected ? 3 : 2.5}" stroke-linecap="round"
              stroke-dasharray="${(contact.relationshipStrength / 100) * 94} 94"/>
          </svg>
          <span style="font:bold ${isSelected ? 12 : 10}px Inter,system-ui,sans-serif;color:${isSelected ? roleColor : 'rgba(255,255,255,0.85)'};z-index:2;position:relative;">${escapeHtml(contact.initials)}</span>
        </div>
      `

      el.addEventListener('click', (e) => { e.stopPropagation(); onSelectContact(contact.id) })
      el.addEventListener('mouseenter', () => setHoveredId(contact.id))
      el.addEventListener('mouseleave', () => setHoveredId(null))

      const marker = new ml.Marker({ element: el, anchor: 'center' })
        .setLngLat([lon, lat])
        .addTo(map)
      markersRef.current.push(marker)

      if (isInternational || isSelected) {
        const label = document.createElement('div')
        label.innerHTML = `
          <div style="text-align:center;pointer-events:none;white-space:nowrap;">
            <div style="font:bold ${isSelected ? 11 : 10}px Inter,system-ui,sans-serif;color:${isSelected ? '#d4a574' : 'rgba(255,255,255,0.7)'};text-shadow:0 1px 4px rgba(0,0,0,0.8);">${escapeHtml(contact.name.split(' ')[0])}</div>
            <div style="font:${isSelected ? 10 : 9}px Inter,system-ui,sans-serif;color:${roleColor}${isSelected ? 'dd' : '99'};text-shadow:0 1px 4px rgba(0,0,0,0.8);">${escapeHtml(contact.company)}</div>
            ${isInternational ? `<div style="font:8px Inter,system-ui,sans-serif;color:rgba(100,180,220,0.6);text-shadow:0 1px 4px rgba(0,0,0,0.8);">${escapeHtml(city)}, ${escapeHtml(country)}</div>` : ''}
          </div>
        `
        const labelMarker = new ml.Marker({ element: label, anchor: 'top', offset: [0, size / 2 + 4] })
          .setLngLat([lon, lat])
          .addTo(map)
        markersRef.current.push(labelMarker)
      }
    })

    // ---- Connection arcs as GeoJSON ----
    try {
      if (map.getLayer('connection-arcs')) map.removeLayer('connection-arcs')
      if (map.getSource('connection-arcs')) map.removeSource('connection-arcs')
      if (map.getLayer('connection-arcs-glow')) map.removeLayer('connection-arcs-glow')
      if (map.getSource('connection-arcs-glow')) map.removeSource('connection-arcs-glow')
    } catch (_) { /* ok */ }

    type ArcFeature = {
      type: 'Feature'
      properties: { selected: boolean; roleColor: string }
      geometry: { type: 'LineString'; coordinates: number[][] }
    }
    const arcFeatures: ArcFeature[] = []
    const glowFeatures: ArcFeature[] = []

    contacts.forEach(({ contact, lat, lon }) => {
      const dist = Math.sqrt((lon - dubaiCoords.lon) ** 2 + (lat - dubaiCoords.lat) ** 2)
      if (dist < 1) return
      const isSelected = contact.id === selectedContactId
      const roleColor = brokerContactRoleColors[contact.role]
      const coords: number[][] = []
      const steps = 40
      for (let i = 0; i <= steps; i++) {
        const t = i / steps
        const lngi = lon + (dubaiCoords.lon - lon) * t
        const lati = lat + (dubaiCoords.lat - lat) * t
        const curve = Math.sin(t * Math.PI) * dist * 0.15
        coords.push([lngi, lati + curve])
      }
      const feature: ArcFeature = { type: 'Feature', properties: { selected: isSelected, roleColor }, geometry: { type: 'LineString', coordinates: coords } }
      arcFeatures.push(feature)
      if (isSelected) glowFeatures.push(feature)
    })

    if (glowFeatures.length > 0) {
      map.addSource('connection-arcs-glow', { type: 'geojson', data: { type: 'FeatureCollection', features: glowFeatures } })
      map.addLayer({ id: 'connection-arcs-glow', type: 'line', source: 'connection-arcs-glow', paint: { 'line-color': '#d4a574', 'line-width': 6, 'line-opacity': 0.12, 'line-blur': 4 } })
    }

    map.addSource('connection-arcs', { type: 'geojson', data: { type: 'FeatureCollection', features: arcFeatures } })
    map.addLayer({
      id: 'connection-arcs', type: 'line', source: 'connection-arcs',
      paint: {
        'line-color': ['case', ['get', 'selected'], '#d4a574', 'rgba(212, 165, 116, 0.3)'],
        'line-width': ['case', ['get', 'selected'], 2.5, 1],
        'line-opacity': ['case', ['get', 'selected'], 0.7, 0.35],
        'line-dasharray': [4, 3],
      },
    })

    // Cleanup for this effect only removes markers & layers (not the map itself)
    return () => {
      markersRef.current.forEach(m => m.remove())
      markersRef.current = []
      try {
        if (map.getStyle()) {
          if (map.getLayer('connection-arcs')) map.removeLayer('connection-arcs')
          if (map.getSource('connection-arcs')) map.removeSource('connection-arcs')
          if (map.getLayer('connection-arcs-glow')) map.removeLayer('connection-arcs-glow')
          if (map.getSource('connection-arcs-glow')) map.removeSource('connection-arcs-glow')
        }
      } catch (_) { /* map already removed */ }
    }
  }, [contacts, selectedContactId, mapReady, onSelectContact])

  // Traveling dots animation  - runs continuously, reads refs (no dependency on hoveredId)
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    // Create canvas overlay once
    if (!arcCanvasRef.current && mapContainerRef.current) {
      const c = document.createElement('canvas')
      c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:5;'
      mapContainerRef.current.appendChild(c)
      arcCanvasRef.current = c
    }
    const arcCanvas = arcCanvasRef.current
    if (!arcCanvas) return

    const dubaiCoords = { lat: DUBAI_LAT, lon: DUBAI_LON }

    function animateDots() {
      if (!map || !arcCanvas) return
      const rect = arcCanvas.parentElement?.getBoundingClientRect()
      if (!rect || rect.width === 0) { animFrameRef.current = requestAnimationFrame(animateDots); return }

      const dpr = window.devicePixelRatio || 2
      arcCanvas.width = rect.width * dpr
      arcCanvas.height = rect.height * dpr
      arcCanvas.style.width = `${rect.width}px`
      arcCanvas.style.height = `${rect.height}px`
      const ctx = arcCanvas.getContext('2d')
      if (!ctx) { animFrameRef.current = requestAnimationFrame(animateDots); return }
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, rect.width, rect.height)

      const t = Date.now() * 0.001
      const curSelected = selectedRef.current
      const curHovered = hoveredRef.current

      contacts.forEach(({ contact, lat, lon }, ci) => {
        const dist = Math.sqrt((lon - dubaiCoords.lon) ** 2 + (lat - dubaiCoords.lat) ** 2)
        if (dist < 1) return

        const isSel = contact.id === curSelected
        const isHov = contact.id === curHovered
        const roleColor = brokerContactRoleColors[contact.role]
        const numDots = isSel ? 3 : isHov ? 2 : 1

        for (let d = 0; d < numDots; d++) {
          const tMod = ((t * 0.25 + ci * 0.4 + d * 0.33) % 1)
          const steps = 40
          const step = tMod * steps
          const idx = Math.floor(step)
          const frac = step - idx
          if (idx >= steps) continue

          const t0 = idx / steps
          const t1 = (idx + 1) / steps
          const lng0 = lon + (dubaiCoords.lon - lon) * t0
          const lat0 = lat + (dubaiCoords.lat - lat) * t0 + Math.sin(t0 * Math.PI) * dist * 0.15
          const lng1 = lon + (dubaiCoords.lon - lon) * t1
          const lat1 = lat + (dubaiCoords.lat - lat) * t1 + Math.sin(t1 * Math.PI) * dist * 0.15

          const lngI = lng0 + (lng1 - lng0) * frac
          const latI = lat0 + (lat1 - lat0) * frac

          try {
            const projected = map.project([lngI, latI])
            const dotSize = isSel ? 4 : isHov ? 3 : 2.5

            const glow = ctx.createRadialGradient(projected.x, projected.y, 0, projected.x, projected.y, dotSize * 3)
            glow.addColorStop(0, (isSel || isHov ? roleColor : '#d4a574') + '40')
            glow.addColorStop(1, 'transparent')
            ctx.beginPath()
            ctx.arc(projected.x, projected.y, dotSize * 3, 0, Math.PI * 2)
            ctx.fillStyle = glow
            ctx.fill()

            ctx.beginPath()
            ctx.arc(projected.x, projected.y, dotSize, 0, Math.PI * 2)
            ctx.fillStyle = isSel || isHov ? roleColor : '#d4a574'
            ctx.globalAlpha = isSel ? 0.9 : isHov ? 0.7 : 0.5
            ctx.fill()
            ctx.globalAlpha = 1
          } catch (_) { /* map not ready */ }
        }
      })

      animFrameRef.current = requestAnimationFrame(animateDots)
    }
    animFrameRef.current = requestAnimationFrame(animateDots)

    return () => {
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [contacts, mapReady])

  // Fly to selected contact
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady || !selectedContactId) return
    const geo = CONTACT_GLOBAL_COORDS[selectedContactId]
    if (!geo) return
    if (geo.city !== 'Dubai') {
      map.flyTo({
        center: [(geo.lon + DUBAI_LON) / 2, (geo.lat + DUBAI_LAT) / 2],
        zoom: Math.max(3, map.getZoom()),
        duration: 1200,
      })
    }
  }, [selectedContactId, mapReady])

  // Floating contact info card
  const hoveredContact = hoveredId ? getBrokerContact(hoveredId) : null
  const selectedC = selectedContactId ? getBrokerContact(selectedContactId) : null
  const displayContact = hoveredContact || selectedC

  // Stats
  const intlCount = contacts.filter(c => {
    const g = CONTACT_GLOBAL_COORDS[c.contact.id]
    return g && g.city !== 'Dubai'
  }).length

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 400 }}>
      {/* MapLibre GL container  - explicit dimensions for WebGL */}
      <div ref={mapContainerRef} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }} />

      {/* Pulse animation CSS */}
      <style>{`
        @keyframes pcis-pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.08); }
        }
        .maplibregl-ctrl-attrib { font-size: 9px !important; opacity: 0.4; }
        .maplibregl-ctrl-group { background: rgba(10,10,10,0.8) !important; border: 1px solid rgba(255,255,255,0.1) !important; border-radius: 8px !important; }
        .maplibregl-ctrl-group button { width: 30px !important; height: 30px !important; }
        .maplibregl-ctrl-group button + button { border-top: 1px solid rgba(255,255,255,0.08) !important; }
        .maplibregl-ctrl button .maplibregl-ctrl-icon { filter: invert(1) brightness(0.7); }
        .maplibregl-ctrl-group button:focus { box-shadow: none !important; }
      `}</style>

      {/* Top-left overlay: title + stats */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <div className="bg-[#0a0a0a]/80 backdrop-blur-md border border-pcis-border/30 rounded-xl px-5 py-3.5">
          <div className="flex items-center gap-3 mb-1.5">
            <span className="text-[13px] font-semibold text-pcis-gold tracking-wide">GLOBAL NETWORK MAP</span>
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          </div>
          <p className="text-[10px] text-pcis-text-muted">
            {contacts.length} contacts · {intlCount} international · {contacts.length - intlCount} Dubai-based
          </p>
        </div>
      </div>

      {/* Legend overlay */}
      <div className="absolute top-4 right-16 z-10 pointer-events-none">
        <div className="bg-[#0a0a0a]/80 backdrop-blur-md border border-pcis-border/30 rounded-xl px-4 py-3">
          <p className="text-[9px] text-pcis-text-muted uppercase tracking-wider mb-2">Connection Strength</p>
          <div className="space-y-1.5">
            {[
              { label: 'Strong (80+)', color: '#22c55e' },
              { label: 'Good (60-79)', color: '#d4a574' },
              { label: 'Moderate (40-59)', color: '#f59e0b' },
              { label: 'Weak (<40)', color: '#ef4444' },
            ].map(c => (
              <div key={c.label} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color, opacity: 0.7 }} />
                <span className="text-[9px] text-pcis-text-muted">{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating contact detail card */}
      {displayContact && (
        <div className="absolute bottom-6 left-6 w-80 bg-[#0a0a0a]/90 backdrop-blur-xl border border-pcis-border/30 rounded-xl p-4 pointer-events-none z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-full flex items-center justify-center border-2"
              style={{ borderColor: brokerContactRoleColors[displayContact.role], backgroundColor: '#0a0a0a' }}>
              <span className="text-[12px] font-bold text-white">{displayContact.initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-pcis-text">{displayContact.name}</p>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px]" style={{ color: brokerContactRoleColors[displayContact.role] }}>{displayContact.role}</span>
                <span className="text-[8px] text-pcis-text-muted">•</span>
                <span className="text-[10px] text-pcis-gold">{displayContact.company}</span>
              </div>
            </div>
            <div className="relative w-11 h-11 flex-shrink-0">
              <svg viewBox="0 0 36 36" className="w-11 h-11 -rotate-90">
                <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="3" />
                <circle cx="18" cy="18" r="15" fill="none" stroke={strengthColor(displayContact.relationshipStrength)}
                  strokeWidth="3" strokeLinecap="round"
                  strokeDasharray={`${(displayContact.relationshipStrength / 100) * 94} 94`}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[12px] font-mono font-bold" style={{ color: strengthColor(displayContact.relationshipStrength) }}>
                {displayContact.relationshipStrength}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="text-pcis-text-muted">{displayContact.location}</span>
            <span className="text-pcis-text-muted">•</span>
            <span className="text-pcis-text-muted">{displayContact.totalDealsShared} deals</span>
            <span className="text-pcis-text-muted">•</span>
            <span className="font-mono" style={{ color: momentumColor(displayContact.momentum) }}>
              {momentumArrow(displayContact.momentum)} {displayContact.momentum}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-2 pt-2 border-t border-pcis-border/20">
            <span className="text-[9px] text-green-400 font-mono">↙ {displayContact.totalReferralsIn} referrals in</span>
            <span className="text-[9px] text-blue-400 font-mono">↗ {displayContact.totalReferralsOut} referrals out</span>
            <span className="ml-auto text-[10px] font-mono text-pcis-gold">{formatAED(displayContact.revenueGenerated)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// SUMMARY STRIP  - network health metrics
// ============================================================

function NetworkSummary() {
  const stats = useMemo(() => getBrokerNetworkStats(), [])

  return (
    <div className="flex items-center gap-5 py-3 px-1">
      <div className="flex items-center gap-1.5">
        <span className="text-[9px] text-pcis-text-muted uppercase tracking-wider">Network</span>
        <span className="text-[10px] font-mono font-bold text-pcis-gold">{stats.total}</span>
        <span className="text-[8px] text-pcis-text-muted">({stats.inner} inner · {stats.middle} mid · {stats.outer} outer)</span>
      </div>

      <div className="h-4 w-px bg-pcis-border/30" />

      <div className="flex items-center gap-1.5">
        <span className="text-[9px] text-pcis-text-muted uppercase tracking-wider">Avg Strength</span>
        <span className="text-[10px] font-mono font-bold" style={{ color: strengthColor(stats.avgStrength) }}>{stats.avgStrength}%</span>
      </div>

      <div className="h-4 w-px bg-pcis-border/30" />

      <div className="flex items-center gap-1.5">
        <span className="text-[9px] text-pcis-text-muted uppercase tracking-wider">Referrals</span>
        <span className="text-[10px] font-mono font-bold text-green-400">↙{stats.totalReferralsIn}</span>
        <span className="text-[10px] font-mono font-bold text-blue-400">↗{stats.totalReferralsOut}</span>
      </div>

      <div className="h-4 w-px bg-pcis-border/30" />

      <div className="flex items-center gap-1.5">
        <span className="text-[9px] text-pcis-text-muted uppercase tracking-wider">Active Deals</span>
        <span className="text-[10px] font-mono font-bold text-pcis-gold">{stats.activeDeals}</span>
      </div>

      <div className="h-4 w-px bg-pcis-border/30" />

      <div className="flex items-center gap-1.5">
        <span className="text-[9px] text-pcis-text-muted uppercase tracking-wider">Commission YTD</span>
        <span className="text-[10px] font-mono font-bold text-green-400">{formatAED(stats.closedRevenue)}</span>
      </div>

      <div className="h-4 w-px bg-pcis-border/30" />

      <div className="flex items-center gap-1.5">
        <span className="text-[9px] text-pcis-text-muted uppercase tracking-wider">Momentum</span>
        <span className="text-[10px] font-mono text-green-400">{stats.heatingCount}↑</span>
        <span className="text-[10px] font-mono text-blue-400">{stats.coolingCount}↓</span>
      </div>
    </div>
  )
}

// ============================================================
// CONTACT LIST CARD  - left panel entry
// ============================================================

function ContactListCard({
  contact,
  isSelected,
  onClick,
}: {
  contact: BrokerContact
  isSelected: boolean
  onClick: () => void
}) {
  const roleColor = brokerContactRoleColors[contact.role]
  const sColor = strengthColor(contact.relationshipStrength)
  const momColor = momentumColor(contact.momentum)
  const days = daysSince(contact.lastInteraction)
  const deals = getContactDeals(contact.id)
  const activeDeals = deals.filter(d => d.status === 'active').length

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border transition-all ${
        isSelected
          ? 'border-pcis-gold/40 bg-pcis-gold/[0.04] ring-1 ring-pcis-gold/15'
          : 'border-pcis-border/20 bg-white/[0.015] hover:bg-white/[0.03] hover:border-pcis-border/40'
      }`}
    >
      {/* Row 1: Role + Tier + Strength */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{
            color: roleColor, backgroundColor: roleColor + '15',
          }}>
            {contact.role}
          </span>
          <span className="text-[9px] text-pcis-text-muted bg-white/[0.04] px-1.5 py-0.5 rounded">
            {tierLabel(contact.tier)}
          </span>
        </div>
        {/* Strength ring */}
        <div className="relative w-9 h-9 flex-shrink-0">
          <svg viewBox="0 0 36 36" className="w-9 h-9 -rotate-90">
            <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="3" />
            <circle cx="18" cy="18" r="15" fill="none" stroke={sColor}
              strokeWidth="3" strokeLinecap="round"
              strokeDasharray={`${(contact.relationshipStrength / 100) * 94} 94`}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-bold" style={{ color: sColor }}>
            {contact.relationshipStrength}
          </span>
        </div>
      </div>

      {/* Row 2: Identity */}
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2"
          style={{ borderColor: roleColor, backgroundColor: '#0a0a0a' }}>
          <span className="text-[9px] font-bold text-white">{contact.initials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold text-pcis-text truncate">{contact.name}</p>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-pcis-gold">{contact.company}</span>
            <span className="text-[8px] text-pcis-text-muted">•</span>
            <span className="text-[10px] text-pcis-text-muted">{contact.location}</span>
          </div>
        </div>
      </div>

      {/* Row 3: Quick stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-pcis-text-muted">Deals</span>
            <span className="text-[10px] font-mono font-bold text-pcis-text-secondary">{contact.totalDealsShared}</span>
            {activeDeals > 0 && (
              <span className="text-[9px] font-mono text-pcis-gold">({activeDeals} live)</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-pcis-text-muted">Ref↙</span>
            <span className="text-[10px] font-mono font-bold text-green-400">{contact.totalReferralsIn}</span>
          </div>
          <span className="text-[9px] font-mono font-bold" style={{ color: momColor }}>
            {momentumArrow(contact.momentum)}
          </span>
        </div>
        <span className={`text-[9px] font-mono ${days > 30 ? 'text-red-400' : days > 14 ? 'text-yellow-400' : 'text-pcis-text-muted'}`}>
          {days === 0 ? 'Today' : `${days}d ago`}
        </span>
      </div>
    </button>
  )
}

// ============================================================
// CONTACT DETAIL  - right panel deep-dive
// ============================================================

function ContactDetail({ contact }: { contact: BrokerContact }) {
  const roleColor = brokerContactRoleColors[contact.role]
  const sColor = strengthColor(contact.relationshipStrength)
  const interactions = useMemo(() => getContactInteractions(contact.id), [contact.id])
  const deals = useMemo(() => getContactDeals(contact.id), [contact.id])
  const activeDeals = deals.filter(d => d.status === 'active')
  const closedDeals = deals.filter(d => d.status === 'closed')
  const days = daysSince(contact.lastInteraction)
  const connected = daysSince(contact.firstConnected)
  const connectedYears = (connected / 365).toFixed(1)

  // Interaction frequency chart (last 6 months)
  const monthCounts = useMemo(() => {
    const counts: number[] = [0, 0, 0, 0, 0, 0]
    const now = new Date()
    interactions.forEach(i => {
      const d = new Date(i.date)
      const monthsAgo = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth())
      if (monthsAgo >= 0 && monthsAgo < 6) counts[5 - monthsAgo]++
    })
    return counts
  }, [interactions])
  const maxMonth = Math.max(1, ...monthCounts)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{
            color: roleColor, backgroundColor: roleColor + '15',
          }}>
            {contact.role}
          </span>
          <span className="text-[10px] text-pcis-text-muted bg-white/[0.04] px-2 py-0.5 rounded">{tierLabel(contact.tier)}</span>
          <span className="text-[10px] font-mono" style={{ color: momentumColor(contact.momentum) }}>
            {momentumArrow(contact.momentum)} {contact.momentum}
          </span>
          {/* Strength ring */}
          <div className="ml-auto relative w-12 h-12 flex-shrink-0">
            <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
              <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="3" />
              <circle cx="18" cy="18" r="15" fill="none" stroke={sColor}
                strokeWidth="3" strokeLinecap="round"
                strokeDasharray={`${(contact.relationshipStrength / 100) * 94} 94`}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[13px] font-mono font-bold" style={{ color: sColor }}>
              {contact.relationshipStrength}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 border-2"
            style={{ borderColor: roleColor, backgroundColor: '#0a0a0a' }}>
            <span className="text-[11px] font-bold text-white">{contact.initials}</span>
          </div>
          <div>
            <p className="text-[14px] font-semibold text-pcis-text">{contact.name}</p>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-pcis-gold">{contact.company}</span>
              <span className="text-[8px] text-pcis-text-muted">•</span>
              <span className="text-[11px] text-pcis-text-muted">{contact.location}</span>
            </div>
          </div>
        </div>

        {/* Contact info */}
        <div className="flex items-center gap-4 mt-2.5">
          <span className="text-[10px] text-pcis-text-muted">{contact.communicationPreference}</span>
          <span className="text-[10px] text-pcis-text-muted">{contact.phone}</span>
        </div>

        {/* Notes */}
        <p className="text-[11px] text-pcis-text-muted leading-relaxed mt-3 italic">&ldquo;{contact.notes}&rdquo;</p>
      </div>

      {/* Key metrics grid */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Trust', value: contact.trustScore, color: strengthColor(contact.trustScore) },
          { label: 'Response', value: `${Math.round(contact.responseRate * 100)}%`, color: contact.responseRate > 0.8 ? '#22c55e' : '#f59e0b' },
          { label: 'Avg Reply', value: `${contact.avgResponseTimeHrs}h`, color: contact.avgResponseTimeHrs < 4 ? '#22c55e' : contact.avgResponseTimeHrs < 12 ? '#f59e0b' : '#ef4444' },
          { label: 'Connected', value: `${connectedYears}y`, color: '#a78bfa' },
        ].map(s => (
          <div key={s.label} className="text-center bg-white/[0.02] border border-pcis-border/20 rounded-lg py-2.5">
            <p className="text-[16px] font-mono font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[9px] text-pcis-text-muted uppercase">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Interaction frequency mini chart */}
      <div>
        <p className="text-[10px] text-pcis-text-muted uppercase tracking-wider mb-2">Interaction Frequency (6mo)</p>
        <div className="flex items-end gap-1.5 h-12">
          {monthCounts.map((count, i) => {
            const h = (count / maxMonth) * 100
            const monthNames = ['6m ago', '5m', '4m', '3m', '2m', 'This mo']
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <span className="text-[8px] font-mono text-pcis-text-muted">{count > 0 ? count : ''}</span>
                <div
                  className="w-full rounded-t"
                  style={{
                    height: `${Math.max(2, h)}%`,
                    backgroundColor: count > 0 ? '#d4a574' : 'rgba(255,255,255,0.04)',
                    opacity: 0.3 + (i / 5) * 0.7,
                  }}
                />
                <span className="text-[7px] text-pcis-text-muted">{monthNames[i]}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Revenue & deal stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center bg-white/[0.02] border border-pcis-border/20 rounded-lg py-2.5">
          <p className="text-[15px] font-mono font-bold text-pcis-gold">{contact.totalDealsShared}</p>
          <p className="text-[8px] text-pcis-text-muted uppercase">Total Deals</p>
        </div>
        <div className="text-center bg-white/[0.02] border border-pcis-border/20 rounded-lg py-2.5">
          <p className="text-[15px] font-mono font-bold text-green-400">{formatAED(contact.revenueGenerated)}</p>
          <p className="text-[8px] text-pcis-text-muted uppercase">Revenue Gen</p>
        </div>
        <div className="text-center bg-white/[0.02] border border-pcis-border/20 rounded-lg py-2.5">
          <div className="flex items-center justify-center gap-1.5">
            <span className="text-[13px] font-mono font-bold text-green-400">↙{contact.totalReferralsIn}</span>
            <span className="text-[13px] font-mono font-bold text-blue-400">↗{contact.totalReferralsOut}</span>
          </div>
          <p className="text-[8px] text-pcis-text-muted uppercase">Referrals In/Out</p>
        </div>
      </div>

      {/* Specialties */}
      <div>
        <p className="text-[10px] text-pcis-text-muted uppercase tracking-wider mb-2">Specialties</p>
        <div className="flex flex-wrap gap-1.5">
          {contact.specialties.map((s, i) => (
            <span key={i} className="text-[10px] text-pcis-text-secondary bg-white/[0.04] px-2.5 py-1 rounded-full border border-pcis-border/15">
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* Active deals */}
      {activeDeals.length > 0 && (
        <div>
          <p className="text-[10px] text-pcis-text-muted uppercase tracking-wider mb-2">Active Deals ({activeDeals.length})</p>
          <div className="space-y-2">
            {activeDeals.map(deal => {
              const client = getClient(deal.clientId)
              return (
                <div key={deal.id} className="flex items-center justify-between p-3 rounded-lg bg-pcis-gold/[0.03] border border-pcis-gold/15">
                  <div>
                    <p className="text-[11px] text-pcis-text font-medium">{deal.property}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {client && <span className="text-[10px] text-pcis-gold">{client.name}</span>}
                      <span className="text-[8px] text-pcis-text-muted">•</span>
                      <span className="text-[10px] text-pcis-text-muted">{deal.brokerRole}</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-pcis-gold">{formatAED(deal.value)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Closed deals */}
      {closedDeals.length > 0 && (
        <div>
          <p className="text-[10px] text-pcis-text-muted uppercase tracking-wider mb-2">Closed Deals ({closedDeals.length})</p>
          <div className="space-y-2">
            {closedDeals.map(deal => {
              const client = getClient(deal.clientId)
              return (
                <div key={deal.id} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-pcis-border/15">
                  <div>
                    <p className="text-[11px] text-pcis-text font-medium">{deal.property}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {client && <span className="text-[10px] text-pcis-text-secondary">{client.name}</span>}
                      <span className="text-[8px] text-pcis-text-muted">•</span>
                      <span className="text-[10px] text-pcis-text-muted">{deal.brokerRole}</span>
                      <span className="text-[8px] text-pcis-text-muted">•</span>
                      <span className="text-[10px] text-green-400 font-mono">{formatAED(deal.commission)}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-pcis-text-muted">{formatDate(deal.closedAt!)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Interaction timeline */}
      <div>
        <p className="text-[10px] text-pcis-text-muted uppercase tracking-wider mb-2">Recent Interactions</p>
        <div className="space-y-2">
          {interactions.slice(0, 6).map(int => {
            const client = int.linkedClientId ? getClient(int.linkedClientId) : null
            const outcomeColor = int.outcome === 'positive' ? '#22c55e' : int.outcome === 'negative' ? '#ef4444' : '#6b7280'
            return (
              <div key={int.id} className="flex items-start gap-2.5 py-2 border-b border-pcis-border/10 last:border-0">
                <span className="text-[12px] text-pcis-text-muted mt-0.5">{interactionTypeIcons[int.type] || '○'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] font-semibold" style={{ color: roleColor }}>{int.type}</span>
                    <span className="text-[8px] text-pcis-text-muted">•</span>
                    <span className="text-[9px] text-pcis-text-muted">{formatDate(int.date)}</span>
                    <div className="w-1.5 h-1.5 rounded-full ml-1" style={{ backgroundColor: outcomeColor }} />
                  </div>
                  <p className="text-[10px] text-pcis-text-secondary leading-relaxed">{int.summary}</p>
                  {client && (
                    <span className="text-[9px] text-pcis-gold mt-0.5 inline-block">↳ {client.name}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Last interaction alert */}
      <div className="flex items-center justify-between p-3.5 rounded-xl" style={{
        backgroundColor: days > 30 ? '#ef444408' : days > 14 ? '#f59e0b08' : '#22c55e08',
        borderLeft: `3px solid ${days > 30 ? '#ef4444' : days > 14 ? '#f59e0b' : '#22c55e'}`,
      }}>
        <div>
          <p className="text-[9px] text-pcis-text-muted uppercase tracking-wider mb-0.5">Last Interaction</p>
          <p className="text-[11px] text-pcis-text">{formatDate(contact.lastInteraction)}</p>
        </div>
        <span className={`text-[11px] font-mono font-bold ${days > 30 ? 'text-red-400 animate-pulse' : days > 14 ? 'text-yellow-400' : 'text-green-400'}`}>
          {days === 0 ? 'TODAY' : `${days}d ago`}
        </span>
      </div>
    </div>
  )
}

// ============================================================
// ANIMATED CARD WRAPPER
// ============================================================

function AnimatedCard({ children, delay }: { children: React.ReactNode; delay: number }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  return (
    <div className="transition-all duration-500 ease-out" style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(8px)',
    }}>
      {children}
    </div>
  )
}

// ============================================================
// MAIN PAGE
// ============================================================

type SortMode = 'strength' | 'recent' | 'deals' | 'referrals'
type ViewMode = 'dashboard' | 'networkmap'

export default function RelationshipsPage() {
  const [roleFilter, setRoleFilter] = useState<BrokerContactRole | 'all'>('all')
  const [tierFilter, setTierFilter] = useState<RelationshipTier | 'all'>('all')
  const [sortMode, setSortMode] = useState<SortMode>('strength')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard')

  // Filter and sort
  const filteredContacts = useMemo(() => {
    let result = [...brokerContacts]
    if (roleFilter !== 'all') result = result.filter(c => c.role === roleFilter)
    if (tierFilter !== 'all') result = result.filter(c => c.tier === tierFilter)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q) ||
        c.role.toLowerCase().includes(q)
      )
    }
    if (sortMode === 'strength') result.sort((a, b) => b.relationshipStrength - a.relationshipStrength)
    else if (sortMode === 'recent') result.sort((a, b) => new Date(b.lastInteraction).getTime() - new Date(a.lastInteraction).getTime())
    else if (sortMode === 'deals') result.sort((a, b) => b.totalDealsShared - a.totalDealsShared)
    else if (sortMode === 'referrals') result.sort((a, b) => b.totalReferralsIn - a.totalReferralsIn)
    return result
  }, [roleFilter, tierFilter, sortMode, searchQuery])

  // Auto-select first contact
  useEffect(() => {
    if (!selectedContactId && filteredContacts.length > 0) {
      setSelectedContactId(filteredContacts[0].id)
    }
  }, [filteredContacts, selectedContactId])

  const selectedContact = selectedContactId ? getBrokerContact(selectedContactId) : null

  return (
    <div
      className="h-full flex flex-col"
      style={viewMode === 'networkmap' ? {
        position: 'relative',
        // Cancel the p-6 (24px) padding from the <main> wrapper so the map goes edge-to-edge
        margin: '-24px',
        width: 'calc(100% + 48px)',
        height: 'calc(100% + 48px)',
      } : { position: 'relative' }}
    >
      {/* Header  - hidden when network map is active (map goes full screen) */}
      {viewMode === 'dashboard' && (
        <div className="flex-shrink-0 bg-pcis-card/40 backdrop-blur-sm border-b border-pcis-border px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-lg font-semibold text-pcis-text">Network Intelligence</h1>
                <p className="text-[11px] text-pcis-text-secondary mt-0.5">Your professional network  - co-brokers, referral partners, and key contacts</p>
              </div>
              {/* View mode switcher  - matching Clients page style */}
              <div className="flex items-center bg-white/[0.03] border border-pcis-border/40 rounded-lg overflow-hidden ml-4">
                {([
                  { key: 'dashboard' as ViewMode, label: 'Dashboard' },
                  { key: 'networkmap' as ViewMode, label: 'Network Map' },
                ]).map((v, i) => (
                  <div key={v.key} className="flex items-center">
                    {i > 0 && <div className="w-px h-5 bg-pcis-border/30" />}
                    <button
                      onClick={() => setViewMode(v.key)}
                      className={`px-3 py-1.5 text-[10px] font-medium transition-colors ${
                        viewMode === v.key ? 'bg-pcis-gold/10 text-pcis-gold' : 'text-pcis-text-muted hover:text-pcis-text'
                      }`}
                    >
                      {v.label}
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search name, company, role..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-52 bg-white/[0.04] border border-pcis-border/30 rounded-lg px-3 py-1.5 text-[11px] text-pcis-text placeholder-pcis-text-muted/50 focus:outline-none focus:border-pcis-gold/30"
              />
              <select
                value={sortMode}
                onChange={e => setSortMode(e.target.value as SortMode)}
                className="bg-white/[0.04] border border-pcis-border/30 rounded-lg px-2.5 py-1.5 text-[10px] text-pcis-text focus:outline-none focus:border-pcis-gold/30"
              >
                <option value="strength">Sort: Strength</option>
                <option value="recent">Sort: Recent</option>
                <option value="deals">Sort: Deals</option>
                <option value="referrals">Sort: Referrals</option>
              </select>
            </div>
          </div>

          {/* Filter pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['all', ...BROKER_CONTACT_ROLES] as const).map(r => (
              <button
                key={r}
                onClick={() => setRoleFilter(r as BrokerContactRole | 'all')}
                className={`px-2.5 py-1 rounded-full text-[9px] font-medium border transition-all ${
                  roleFilter === r
                    ? 'border-pcis-gold/40 bg-pcis-gold/10 text-pcis-gold'
                    : 'border-pcis-border/20 text-pcis-text-muted hover:text-pcis-text hover:border-pcis-border/40'
                }`}
              >
                {r === 'all' ? 'All Roles' : r}
              </button>
            ))}

            <div className="h-4 w-px bg-pcis-border/30 mx-1" />

            {(['all', 'inner', 'middle', 'outer'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTierFilter(t as RelationshipTier | 'all')}
                className={`px-2.5 py-1 rounded-full text-[9px] font-medium border transition-all ${
                  tierFilter === t
                    ? 'border-pcis-gold/40 bg-pcis-gold/10 text-pcis-gold'
                    : 'border-pcis-border/20 text-pcis-text-muted hover:text-pcis-text hover:border-pcis-border/40'
                }`}
              >
                {t === 'all' ? 'All Tiers' : tierLabel(t)}
              </button>
            ))}

            <span className="ml-auto text-[10px] font-mono text-pcis-text-muted">{filteredContacts.length} contact{filteredContacts.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      )}

      {/* Floating tab switcher when in Network Map mode  - centered at top of map */}
      {viewMode === 'networkmap' && (
        <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 20 }}>
          <div className="flex items-center bg-[#0a0a0a]/80 backdrop-blur-md border border-pcis-border/40 rounded-lg overflow-hidden">
            {([
              { key: 'dashboard' as ViewMode, label: 'Dashboard' },
              { key: 'networkmap' as ViewMode, label: 'Network Map' },
            ]).map((v, i) => (
              <div key={v.key} className="flex items-center">
                {i > 0 && <div className="w-px h-5 bg-pcis-border/30" />}
                <button
                  onClick={() => setViewMode(v.key)}
                  className={`px-3.5 py-2 text-[10px] font-medium transition-colors ${
                    viewMode === v.key ? 'bg-pcis-gold/10 text-pcis-gold' : 'text-pcis-text-muted hover:text-pcis-text'
                  }`}
                >
                  {v.label}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content  - both views always mounted; map uses visibility (not display) to keep real dimensions */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative', minHeight: 0 }}>
        {/* Network map  - absolute-positioned so it always has real pixel dimensions for WebGL */}
        <div
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            width: '100%', height: '100%',
            visibility: viewMode === 'networkmap' ? 'visible' : 'hidden',
            zIndex: viewMode === 'networkmap' ? 10 : 0,
          }}
        >
          <FullWorldMap
            selectedContactId={selectedContactId}
            onSelectContact={setSelectedContactId}
            roleFilter={roleFilter}
            isVisible={viewMode === 'networkmap'}
          />
        </div>
        {/* Dashboard view */}
        <div className="h-full flex flex-col" style={{ display: viewMode === 'dashboard' ? 'flex' : 'none' }}>
        {/* Summary strip */}
        <div className="px-6 border-b border-pcis-border/20">
          <NetworkSummary />
        </div>

        {/* Main: Globe + List / Detail */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left panel */}
          <div className="w-[420px] flex-shrink-0 border-r border-pcis-border/20 overflow-y-auto">
            {/* Contact cards */}
            <div className="px-4 py-4 space-y-3">
              {filteredContacts.map((contact, i) => (
                <AnimatedCard key={contact.id} delay={i * 60}>
                  <ContactListCard
                    contact={contact}
                    isSelected={selectedContactId === contact.id}
                    onClick={() => setSelectedContactId(contact.id)}
                  />
                </AnimatedCard>
              ))}
              {filteredContacts.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-[12px] text-pcis-text-muted">No contacts match filters</p>
                </div>
              )}
            </div>
          </div>

          {/* Right panel  - detail */}
          <div className="flex-1 overflow-y-auto p-6">
            {selectedContact ? (
              <ContactDetail contact={selectedContact} />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-[12px] text-pcis-text-muted">Select a contact to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}
