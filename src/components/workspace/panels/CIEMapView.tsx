'use client'

import React, { useState, useMemo, useEffect, useRef } from 'react'
import { escapeHtml } from '@/lib/sanitize'
import { useCIEClients } from '@/lib/useCIEData'
import {
  cieClients as mockCieClients,
  ARCHETYPES,
  type CIEClient,
  type Archetype,
} from '@/lib/cieData'
import {
  DEAL_STAGES,
  dealStageColors,
  type Client,
} from '@/lib/mockData'
import { useWorkspaceNav } from '../useWorkspaceNav'

import type * as MaplibreGL from 'maplibre-gl'

// ============================================================================
// CIE CLIENT MAP — E1 Workspace Panel (CIM)
//
// Adapted from the Clients page world map. Shows client locations with CIE
// intelligence overlays: archetype colors, CIE score rings, engagement status.
// ============================================================================

// ── City coordinates ────────────────────────────────────────────────────

const CITY_COORDS: Record<string, { lat: number; lon: number }> = {
  'Dubai':          { lat: 25.20, lon: 55.27 },
  'Shanghai':       { lat: 31.23, lon: 121.47 },
  'Moscow':         { lat: 55.75, lon: 37.62 },
  'London':         { lat: 51.51, lon: -0.13 },
  'Tokyo':          { lat: 35.68, lon: 139.69 },
  'Amsterdam':      { lat: 52.37, lon: 4.90 },
  'Paris':          { lat: 48.86, lon: 2.35 },
  'Riyadh':         { lat: 24.69, lon: 46.72 },
  'Munich':         { lat: 48.14, lon: 11.58 },
  'Milan':          { lat: 45.46, lon: 9.19 },
  'Seoul':          { lat: 37.57, lon: 126.98 },
  'Mumbai':         { lat: 19.08, lon: 72.88 },
  'São Paulo':      { lat: -23.55, lon: -46.63 },
  'New York':       { lat: 40.71, lon: -74.01 },
  'Stockholm':      { lat: 59.33, lon: 18.07 },
  'Osaka':          { lat: 34.69, lon: 135.50 },
  'Madrid':         { lat: 40.42, lon: -3.70 },
  'St. Petersburg': { lat: 59.93, lon: 30.32 },
  'Abu Dhabi':      { lat: 24.45, lon: 54.65 },
  'Hong Kong':      { lat: 22.32, lon: 114.17 },
  'Singapore':      { lat: 1.35, lon: 103.82 },
  'Sydney':         { lat: -33.87, lon: 151.21 },
  'Zurich':         { lat: 47.38, lon: 8.54 },
  'Geneva':         { lat: 46.20, lon: 6.15 },
  'Monaco':         { lat: 43.73, lon: 7.42 },
}

function getCityFromLocation(location: string): string {
  return location.split(',')[0].trim()
}

const typeColors: Record<string, string> = {
  'UHNW': '#d4a574',
  'HNW': '#22c55e',
  'Affluent': '#3b82f6',
}

const getArchetypeColor = (archetype: Archetype): string => {
  const config = ARCHETYPES.find(a => a.id === archetype)
  return config?.color || '#D4A574'
}

const getEngagementColor = (status: string): string => {
  switch (status) {
    case 'thriving': return '#22c55e'
    case 'active': return '#06b6d4'
    case 'cooling': return '#f59e0b'
    case 'cold': return '#ef4444'
    case 'dormant': return '#6b7280'
    default: return '#9ca3af'
  }
}

// ============================================================================
// Component
// ============================================================================

export default function CIEMapView(): React.ReactElement {
  const nav = useWorkspaceNav()
  const { data: liveCIEClients } = useCIEClients()
  const cieClients = liveCIEClients || mockCieClients

  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MaplibreGL.Map | null>(null)
  const mlRef = useRef<typeof MaplibreGL | null>(null)
  const markersRef = useRef<MaplibreGL.Marker[]>([])
  const initStartedRef = useRef(false)
  const [mapReady, setMapReady] = useState(false)
  const [hoveredClient, setHoveredClient] = useState<CIEClient | null>(null)
  const [selectedClient, setSelectedClient] = useState<CIEClient | null>(null)

  const displayClient = hoveredClient || selectedClient

  const summary = useMemo(() => {
    const avgCIEScore = cieClients.length > 0
      ? Math.round(cieClients.reduce((sum, c) => sum + c.overallCIEScore, 0) / cieClients.length)
      : 0
    const archetypeBreakdown: Record<string, number> = {}
    ARCHETYPES.forEach(a => {
      archetypeBreakdown[a.id] = cieClients.filter(c => c.archetype === a.id).length
    })
    return { avgCIEScore, archetypeBreakdown }
  }, [cieClients])

  const clientPositions = useMemo(() => {
    return cieClients.map(cie => {
      const city = getCityFromLocation(cie.client.location)
      const coords = CITY_COORDS[city] || CITY_COORDS['Dubai']
      const jLat = (Math.sin(cie.client.id.charCodeAt(1) * 7.3) * 0.5)
      const jLon = (Math.cos(cie.client.id.charCodeAt(1) * 5.7) * 0.5)
      return { cie, lat: coords.lat + jLat, lon: coords.lon + jLon, city }
    })
  }, [cieClients])

  // Initialize MapLibre GL
  useEffect(() => {
    if (!mapContainerRef.current) return
    if (mapRef.current) {
      try { mapRef.current.resize(); setMapReady(true) } catch (_) { mapRef.current = null }
      if (mapRef.current) return
    }
    if (initStartedRef.current) return
    initStartedRef.current = true
    let cancelled = false

    async function init() {
      const mlModule = await import('maplibre-gl')
      const ml = (mlModule as any).default || mlModule
      if (typeof ml.Map !== 'function') { initStartedRef.current = false; return }

      if (!document.querySelector('style[data-maplibre]')) {
        const style = document.createElement('style')
        style.setAttribute('data-maplibre', 'true')
        style.textContent = `
          .maplibregl-map{font:12px/20px Helvetica Neue,Arial,Helvetica,sans-serif;overflow:hidden;position:relative;-webkit-tap-highlight-color:rgba(0,0,0,0)}
          .maplibregl-canvas{left:0;position:absolute;top:0}
          .maplibregl-canvas-container.maplibregl-interactive{cursor:grab;user-select:none}
          .maplibregl-canvas-container.maplibregl-interactive:active{cursor:grabbing}
          .maplibregl-ctrl-bottom-left,.maplibregl-ctrl-bottom-right,.maplibregl-ctrl-top-left,.maplibregl-ctrl-top-right{pointer-events:none;position:absolute;z-index:2}
          .maplibregl-ctrl-top-left{left:0;top:0}.maplibregl-ctrl-top-right{right:0;top:0}
          .maplibregl-ctrl-bottom-left{bottom:0;left:0}.maplibregl-ctrl-bottom-right{bottom:0;right:0}
          .maplibregl-ctrl{clear:both;pointer-events:auto;transform:translate(0)}
          .maplibregl-ctrl-top-right .maplibregl-ctrl{float:right;margin:10px 10px 0 0}
          .maplibregl-ctrl-bottom-right .maplibregl-ctrl{float:right;margin:0 10px 10px 0}
          .maplibregl-ctrl-group{background:#fff;border-radius:4px;box-shadow:0 0 0 2px rgba(0,0,0,.1)}
          .maplibregl-ctrl-group button{background-color:transparent;border:0;box-sizing:border-box;cursor:pointer;display:block;height:29px;outline:none;overflow:hidden;padding:0;width:29px}
          .maplibregl-ctrl-group button+button{border-top:1px solid #ddd}
          .maplibregl-marker{position:absolute;top:0;left:0;will-change:transform}
        `
        document.head.appendChild(style)
      }
      if (!document.querySelector('link[href*="maplibre-gl"]')) {
        const link = document.createElement('link'); link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/maplibre-gl@latest/dist/maplibre-gl.css'
        document.head.appendChild(link)
      }
      if (cancelled || !mapContainerRef.current) { initStartedRef.current = false; return }
      mlRef.current = ml

      while (mapContainerRef.current.firstChild) {
        mapContainerRef.current.removeChild(mapContainerRef.current.firstChild)
      }

      const map = new ml.Map({
        container: mapContainerRef.current,
        style: {
          version: 8 as const,
          sources: { 'carto-dark': { type: 'raster' as const, tiles: [
            'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
            'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
            'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
          ], tileSize: 256, maxzoom: 20 } },
          layers: [{ id: 'carto-dark-layer', type: 'raster' as const, source: 'carto-dark', minzoom: 0, maxzoom: 20 }],
        },
        center: [40, 25], zoom: 2.5, minZoom: 2, maxZoom: 18,
        attributionControl: false,
      })

      map.addControl(new ml.NavigationControl({ showCompass: true, showZoom: true, visualizePitch: true }), 'bottom-right')

      map.on('load', () => {
        if (cancelled) { map.remove(); initStartedRef.current = false; return }
        mapRef.current = map; map.resize(); setMapReady(true)
      })
    }
    init()

    return () => {
      cancelled = true
      markersRef.current.forEach(m => m.remove()); markersRef.current = []
      setMapReady(false)
    }
  }, [])

  // Add markers with CIE data
  useEffect(() => {
    const map = mapRef.current; const ml = mlRef.current
    if (!map || !ml || !mapReady) return

    markersRef.current.forEach(m => m.remove()); markersRef.current = []

    // Dubai HQ marker
    const hqEl = document.createElement('div')
    hqEl.innerHTML = `
      <div style="position:relative;width:50px;height:50px;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;inset:0;border-radius:50%;border:2px solid rgba(212,165,116,0.3);animation:pcis-client-pulse 2s ease-in-out infinite;"></div>
        <div style="position:absolute;inset:10px;border-radius:50%;border:1px solid rgba(212,165,116,0.2);animation:pcis-client-pulse 2s ease-in-out infinite 0.3s;"></div>
        <div style="width:12px;height:12px;border-radius:50%;background:radial-gradient(circle,#d4a574 0%,#8a6540 100%);box-shadow:0 0 20px rgba(212,165,116,0.4);border:2px solid rgba(255,255,255,0.3);"></div>
      </div>
    `
    markersRef.current.push(new ml.Marker({ element: hqEl, anchor: 'center' }).setLngLat([55.27, 25.20]).addTo(map))

    const hqLabel = document.createElement('div')
    hqLabel.innerHTML = `<div style="background:rgba(10,10,10,0.85);backdrop-filter:blur(8px);border:1px solid rgba(212,165,116,0.3);border-radius:8px;padding:5px 10px;pointer-events:none;">
      <div style="font:bold 10px Inter,system-ui,sans-serif;color:#d4a574;">YOUR OFFICE</div>
      <div style="font:9px Inter,system-ui,sans-serif;color:rgba(255,255,255,0.4);">Dubai · ${cieClients.length} profiled clients worldwide</div>
    </div>`
    markersRef.current.push(new ml.Marker({ element: hqLabel, anchor: 'left', offset: [18, 0] }).setLngLat([55.27, 25.20]).addTo(map))

    // Client markers with CIE intelligence
    clientPositions.forEach(({ cie, lat, lon, city }) => {
      const archColor = getArchetypeColor(cie.archetype)
      const engColor = getEngagementColor(cie.engagement?.status || 'dormant')
      const budget = cie.client.financialProfile.budgetMax
      const size = budget >= 100_000_000 ? 38 : budget >= 50_000_000 ? 34 : 30

      // CIE score determines ring progress
      const ringProgress = cie.overallCIEScore / 100

      const el = document.createElement('div')
      el.style.cursor = 'pointer'
      el.innerHTML = `
        <div style="position:relative;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;">
          <svg viewBox="0 0 36 36" width="${size}" height="${size}" style="position:absolute;inset:0;transform:rotate(-90deg);">
            <circle cx="18" cy="18" r="15" fill="rgba(10,10,10,0.9)" stroke="rgba(255,255,255,0.06)" stroke-width="2"/>
            <circle cx="18" cy="18" r="15" fill="none" stroke="${archColor}" stroke-width="2.5" stroke-linecap="round"
              stroke-dasharray="${ringProgress * 94} 94"/>
          </svg>
          <span style="font:bold 10px Inter,system-ui,sans-serif;color:${engColor};z-index:2;position:relative;">${escapeHtml(cie.client.initials)}</span>
        </div>
      `

      el.addEventListener('click', (e) => { e.stopPropagation(); setSelectedClient(cie); nav.openCIEProfile(cie.client.id) })
      el.addEventListener('mouseenter', () => setHoveredClient(cie))
      el.addEventListener('mouseleave', () => setHoveredClient(null))

      markersRef.current.push(new ml.Marker({ element: el, anchor: 'center' }).setLngLat([lon, lat]).addTo(map))

      // Name label
      if (city !== 'Dubai') {
        const label = document.createElement('div')
        label.innerHTML = `<div style="text-align:center;pointer-events:none;white-space:nowrap;">
          <div style="font:bold 10px Inter,system-ui,sans-serif;color:rgba(255,255,255,0.7);text-shadow:0 1px 4px rgba(0,0,0,0.8);">${escapeHtml(cie.client.name.split(' ')[0])}</div>
          <div style="font:9px Inter,system-ui,sans-serif;color:${archColor}99;text-shadow:0 1px 4px rgba(0,0,0,0.8);">${escapeHtml(ARCHETYPES.find(a => a.id === cie.archetype)?.label || '')}</div>
        </div>`
        markersRef.current.push(new ml.Marker({ element: label, anchor: 'top', offset: [0, size / 2 + 3] }).setLngLat([lon, lat]).addTo(map))
      }
    })

    // Connection arcs to Dubai
    try {
      if (map.getLayer('client-arcs')) map.removeLayer('client-arcs')
      if (map.getSource('client-arcs')) map.removeSource('client-arcs')
    } catch (_) {}

    const arcFeatures: any[] = []
    clientPositions.forEach(({ cie, lat, lon }) => {
      const dist = Math.sqrt((lon - 55.27) ** 2 + (lat - 25.20) ** 2)
      if (dist < 2) return
      const coords: number[][] = []
      for (let i = 0; i <= 40; i++) {
        const t = i / 40
        coords.push([lon + (55.27 - lon) * t, lat + (25.20 - lat) * t + Math.sin(t * Math.PI) * dist * 0.12])
      }
      arcFeatures.push({ type: 'Feature', properties: { color: getArchetypeColor(cie.archetype) }, geometry: { type: 'LineString', coordinates: coords } })
    })

    if (arcFeatures.length > 0) {
      map.addSource('client-arcs', { type: 'geojson', data: { type: 'FeatureCollection', features: arcFeatures } })
      map.addLayer({ id: 'client-arcs', type: 'line', source: 'client-arcs', paint: {
        'line-color': ['get', 'color'], 'line-width': 1, 'line-opacity': 0.25, 'line-dasharray': [4, 3],
      }})
    }

    return () => {
      markersRef.current.forEach(m => m.remove()); markersRef.current = []
      try {
        if (map.getStyle()) {
          if (map.getLayer('client-arcs')) map.removeLayer('client-arcs')
          if (map.getSource('client-arcs')) map.removeSource('client-arcs')
        }
      } catch (_) {}
    }
  }, [clientPositions, mapReady, nav])

  const uhnwCount = cieClients.filter(c => c.client.type === 'UHNW').length
  const intlCount = clientPositions.filter(c => c.city !== 'Dubai').length

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 400 }}>
      <div ref={mapContainerRef} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }} />

      <style>{`
        @keyframes pcis-client-pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.08); }
        }
        .maplibregl-ctrl-group { background: rgba(10,10,10,0.8) !important; border: 1px solid rgba(255,255,255,0.1) !important; border-radius: 8px !important; }
        .maplibregl-ctrl-group button { width: 30px !important; height: 30px !important; }
        .maplibregl-ctrl button .maplibregl-ctrl-icon { filter: invert(1) brightness(0.7); }
      `}</style>

      {/* Top-left stats */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <div className="bg-[#0a0a0a]/80 backdrop-blur-md border border-pcis-border/30 rounded-xl px-5 py-3.5">
          <div className="flex items-center gap-3 mb-1.5">
            <span className="text-[13px] font-semibold text-pcis-gold tracking-wide">CIE CLIENT MAP</span>
            <span className="text-[8px] font-mono text-pcis-text-muted/50">CIM</span>
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          </div>
          <p className="text-[10px] text-pcis-text-muted">
            {cieClients.length} profiled · {uhnwCount} UHNW · {intlCount} international · Avg CIE {summary.avgCIEScore}
          </p>
        </div>
      </div>

      {/* Archetype Legend */}
      <div className="absolute top-4 right-16 z-10 pointer-events-none">
        <div className="bg-[#0a0a0a]/80 backdrop-blur-md border border-pcis-border/30 rounded-xl px-4 py-3">
          <p className="text-[9px] text-pcis-text-muted uppercase tracking-wider mb-2">Archetype</p>
          <div className="space-y-1.5">
            {ARCHETYPES.map(a => (
              <div key={a.id} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: a.color, opacity: 0.7 }} />
                <span className="text-[9px] text-pcis-text-muted">{a.label}</span>
                <span className="text-[8px] font-mono text-pcis-text-muted/40 ml-auto">
                  {summary.archetypeBreakdown[a.id]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating CIE client card */}
      {displayClient && (
        <div className="absolute bottom-6 left-6 w-80 bg-[#0a0a0a]/90 backdrop-blur-xl border border-pcis-border/30 rounded-xl p-4 pointer-events-none z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-full flex items-center justify-center border-2"
              style={{ borderColor: getArchetypeColor(displayClient.archetype), backgroundColor: '#0a0a0a' }}>
              <span className="text-[12px] font-bold text-white">{displayClient.client.initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-pcis-text">{displayClient.client.name}</p>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px]" style={{ color: typeColors[displayClient.client.type] }}>{displayClient.client.type}</span>
                <span className="text-[8px] text-pcis-text-muted">•</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded" style={{
                  backgroundColor: `${getArchetypeColor(displayClient.archetype)}20`,
                  color: getArchetypeColor(displayClient.archetype),
                }}>
                  {ARCHETYPES.find(a => a.id === displayClient.archetype)?.label}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[16px] font-mono font-bold" style={{
                color: displayClient.overallCIEScore >= 80 ? '#22c55e' : displayClient.overallCIEScore >= 65 ? '#f59e0b' : '#3b82f6'
              }}>
                {displayClient.overallCIEScore}
              </div>
              <div className="text-[8px] text-pcis-text-muted">CIE Score</div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="text-pcis-text-muted">{displayClient.client.location}</span>
            <span className="text-pcis-text-muted">•</span>
            <span style={{ color: getEngagementColor(displayClient.engagement?.status || 'dormant') }}>
              {displayClient.engagement?.status || 'unknown'}
            </span>
            <span className="text-pcis-text-muted">•</span>
            <span style={{ color: dealStageColors[displayClient.client.dealStage] }}>{displayClient.client.dealStage}</span>
            <span className="ml-auto text-pcis-gold font-mono">
              AED {(displayClient.client.financialProfile.budgetMax / 1_000_000).toFixed(0)}M
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
