'use client'

import React, { useState, useRef, useEffect, useMemo } from 'react'
import { useWorkspace, PANEL_REGISTRY, PanelType } from './WorkspaceProvider'
import { usePlatformKey } from '@/lib/platform'
import { clients, matches, properties, recommendations, intelFeed } from '@/lib/mockData'
import { areas } from '@/lib/marketData'

// ============================================================================
// PCIS Command Bar — Bloomberg GO-style Command System
// ============================================================================
// Persistent command bar: ⌘K to toggle. Fuzzy search across panels, clients,
// properties, matches, actions, and workspace presets. Type-ahead results
// with keyboard navigation (↑↓ Enter Esc).
// ============================================================================

// ---------------------------------------------------------------------------
// Command Types
// ---------------------------------------------------------------------------

interface CommandItem {
  id: string
  label: string
  sublabel?: string
  category: string
  icon: string
  action: () => void
  shortcut?: string
  score?: number
}

// ---------------------------------------------------------------------------
// Fuzzy Match
// ---------------------------------------------------------------------------

function fuzzyMatch(query: string, text: string): number {
  const q = query.toLowerCase()
  const t = text.toLowerCase()
  if (t.includes(q)) return 100 - t.indexOf(q) // Exact substring match gets high score
  let score = 0
  let qi = 0
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) { score += 10; qi++ }
  }
  return qi === q.length ? score : 0
}

// ---------------------------------------------------------------------------
// Command Bar Component
// ---------------------------------------------------------------------------

export default function CommandBar() {
  const { state, dispatch, openPanel, loadPreset } = useWorkspace()
  const pk = usePlatformKey()
  const inputRef = useRef<HTMLInputElement>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  // Focus input when opened — double-frame + timeout to guarantee focus
  useEffect(() => {
    if (state.commandBarOpen) {
      setSelectedIndex(0)
      // Try multiple times to ensure focus lands
      requestAnimationFrame(() => {
        inputRef.current?.focus()
        requestAnimationFrame(() => {
          inputRef.current?.focus()
        })
      })
      // Fallback: force focus after a short delay
      const timer = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(timer)
    }
  }, [state.commandBarOpen])

  // ---------------------------------------------------------------------------
  // Build command registry
  // ---------------------------------------------------------------------------

  const allCommands = useMemo((): CommandItem[] => {
    const cmds: CommandItem[] = []

    // Panel commands
    Object.entries(PANEL_REGISTRY).forEach(([type, reg]) => {
      if (type.includes('-detail')) return // Skip detail types from direct access
      if (type.startsWith('cie-')) return // CIE panels have explicit entries below
      cmds.push({
        id: `panel-${type}`,
        label: reg.title,
        sublabel: 'Open panel',
        category: 'Panels',
        icon: reg.icon,
        shortcut: reg.shortcut ? `${reg.shortcut}` : undefined,
        action: () => openPanel(type as PanelType, 'replace'),
      })
    })

    // Split commands
    cmds.push({
      id: 'split-right',
      label: 'Split Right',
      sublabel: 'Add panel to the right',
      category: 'Layout',
      icon: '⊞',
      shortcut: '⌘\\',
      action: () => openPanel('dashboard', 'split-right'),
    })
    cmds.push({
      id: 'split-below',
      label: 'Split Below',
      sublabel: 'Add panel below',
      category: 'Layout',
      icon: '⊟',
      shortcut: '⌘⇧\\',
      action: () => openPanel('dashboard', 'split-below'),
    })

    // Workspace presets
    state.presets.forEach((preset) => {
      cmds.push({
        id: `preset-${preset.id}`,
        label: preset.name,
        sublabel: `Workspace layout — ${preset.shortcut}`,
        category: 'Workspaces',
        icon: 'W',
        shortcut: `Alt+${preset.shortcut.replace('W', '')}`,
        action: () => loadPreset(preset.id),
      })
    })

    // Client commands
    clients.forEach((client) => {
      cmds.push({
        id: `client-${client.id}`,
        label: client.name,
        sublabel: `${client.type} · ${client.category} · ${client.location}`,
        category: 'Clients',
        icon: client.initials,
        action: () => openPanel('client-detail', 'tab', client.id),
      })
    })

    // Property commands
    properties.forEach((prop: any) => {
      cmds.push({
        id: `property-${prop.id}`,
        label: prop.name || prop.title || `Property ${prop.id}`,
        sublabel: prop.area || prop.location || '',
        category: 'Properties',
        icon: 'PRP',
        action: () => openPanel('property-detail', 'tab', prop.id),
      })
    })

    // Area commands
    areas.forEach((area) => {
      cmds.push({
        id: `area-${area.id}`,
        label: area.name,
        sublabel: `Demand ${area.demandScore} · ${area.outlook} · AED ${area.avgPriceSqft}/sqft`,
        category: 'Areas',
        icon: area.shortName,
        action: () => openPanel('area-profile', 'tab', area.id),
      })
    })

    // Transaction Intelligence commands
    cmds.push({
      id: 'panel-transaction-feed',
      label: 'Transaction Feed',
      sublabel: 'Live DLD transaction registrations',
      category: 'Transaction Intelligence',
      icon: 'TXN',
      action: () => openPanel('transaction-feed', 'replace'),
    })
    cmds.push({
      id: 'panel-volume-analysis',
      label: 'Volume Analysis',
      sublabel: 'Transaction volume trends by area, type, time',
      category: 'Transaction Intelligence',
      icon: 'VOL',
      action: () => openPanel('volume-analysis', 'replace'),
    })
    cmds.push({
      id: 'panel-buyer-demographics',
      label: 'Buyer Demographics',
      sublabel: 'Nationality breakdown, cash vs mortgage, trends',
      category: 'Transaction Intelligence',
      icon: 'BUY',
      action: () => openPanel('buyer-demographics', 'replace'),
    })
    cmds.push({
      id: 'panel-top-transactions',
      label: 'Top Transactions',
      sublabel: 'Biggest deals leaderboard',
      category: 'Transaction Intelligence',
      icon: 'TOP',
      action: () => openPanel('top-transactions', 'replace'),
    })
    cmds.push({
      id: 'panel-building-analytics',
      label: 'Building Analytics',
      sublabel: 'Per-building transaction history and trends',
      category: 'Transaction Intelligence',
      icon: 'BLD',
      action: () => openPanel('building-analytics', 'replace'),
    })

    // Price Intelligence commands
    cmds.push({
      id: 'panel-price-map',
      label: 'Price Intelligence',
      sublabel: 'Area-by-area price comparison and momentum',
      category: 'Price Intelligence',
      icon: 'PRC',
      action: () => openPanel('price-map', 'replace'),
    })
    cmds.push({
      id: 'panel-comparables',
      label: 'Comparables Engine',
      sublabel: 'Transaction-based valuation analysis',
      category: 'Price Intelligence',
      icon: 'CMP',
      action: () => openPanel('comparables', 'replace'),
    })
    cmds.push({
      id: 'panel-price-trends',
      label: 'Price Trends',
      sublabel: 'Multi-area price trajectory overlay',
      category: 'Price Intelligence',
      icon: 'TRD',
      action: () => openPanel('price-trends', 'replace'),
    })
    cmds.push({
      id: 'panel-valuation-matrix',
      label: 'Valuation Matrix',
      sublabel: 'Building-level pricing and premium analysis',
      category: 'Price Intelligence',
      icon: 'VAL',
      action: () => openPanel('valuation-matrix', 'replace'),
    })
    cmds.push({
      id: 'panel-price-alerts',
      label: 'Price Alerts',
      sublabel: 'Anomaly detection and opportunity signals',
      category: 'Price Intelligence',
      icon: 'ALT',
      action: () => openPanel('price-alerts', 'replace'),
    })

    // Off-Plan Intelligence commands
    cmds.push({
      id: 'panel-offplan-feed',
      label: 'Off-Plan Projects',
      sublabel: 'Active off-plan projects with payment plans',
      category: 'Off-Plan Intelligence',
      icon: 'OFP',
      action: () => openPanel('offplan-feed', 'replace'),
    })
    cmds.push({
      id: 'panel-developer-analytics',
      label: 'Developer Analytics',
      sublabel: 'Developer track records and comparison',
      category: 'Off-Plan Intelligence',
      icon: 'DEV',
      action: () => openPanel('developer-analytics', 'replace'),
    })
    cmds.push({
      id: 'panel-payment-plans',
      label: 'Payment Plans',
      sublabel: 'Compare payment plans across projects',
      category: 'Off-Plan Intelligence',
      icon: 'PAY',
      action: () => openPanel('payment-plans', 'replace'),
    })
    cmds.push({
      id: 'panel-launch-monitor',
      label: 'Launch Monitor',
      sublabel: 'Upcoming and active project launches',
      category: 'Off-Plan Intelligence',
      icon: 'LCH',
      action: () => openPanel('launch-monitor', 'replace'),
    })

    // Macro Intelligence commands
    cmds.push({
      id: 'panel-macro-dashboard',
      label: 'Macro Intelligence',
      sublabel: 'Economic & demographic overview',
      category: 'Macro Intelligence',
      icon: 'MCR',
      action: () => openPanel('macro-dashboard', 'replace'),
    })
    cmds.push({
      id: 'panel-visa-population',
      label: 'Visa & Population',
      sublabel: 'Visa issuance, demographics, nationality breakdown',
      category: 'Macro Intelligence',
      icon: 'VIS',
      action: () => openPanel('visa-population', 'replace'),
    })
    cmds.push({
      id: 'panel-economic-indicators',
      label: 'Economic Indicators',
      sublabel: 'GDP, trade, FDI, construction, mortgage market',
      category: 'Macro Intelligence',
      icon: 'ECO',
      action: () => openPanel('economic-indicators', 'replace'),
    })
    cmds.push({
      id: 'panel-regulatory-tracker',
      label: 'Regulatory Tracker',
      sublabel: 'Policy changes, visa rules, ownership laws',
      category: 'Macro Intelligence',
      icon: 'REG',
      action: () => openPanel('regulatory-tracker', 'replace'),
    })
    cmds.push({
      id: 'panel-tourism-demand',
      label: 'Tourism & Demand',
      sublabel: 'Visitor flows, events, demand drivers',
      category: 'Macro Intelligence',
      icon: 'TOR',
      action: () => openPanel('tourism-demand', 'replace'),
    })

    // Market Signals commands
    cmds.push({
      id: 'panel-signal-feed',
      label: 'Market Signals',
      sublabel: 'Real-time intelligence feed',
      category: 'Market Signals',
      icon: 'SIG',
      action: () => openPanel('signal-feed', 'replace'),
    })
    cmds.push({
      id: 'panel-opportunity-radar',
      label: 'Opportunity Radar',
      sublabel: 'Curated buy/sell/watch recommendations',
      category: 'Market Signals',
      icon: 'OPP',
      action: () => openPanel('opportunity-radar', 'replace'),
    })
    cmds.push({
      id: 'panel-emerging-areas',
      label: 'Emerging Areas',
      sublabel: 'Growth-phase market detection',
      category: 'Market Signals',
      icon: 'EMG',
      action: () => openPanel('emerging-areas', 'replace'),
    })
    cmds.push({
      id: 'panel-my-listings',
      label: 'My Listings',
      sublabel: 'Your inventory with SCOUT intelligence overlay',
      category: 'Market Signals',
      icon: 'LST',
      action: () => openPanel('my-listings', 'replace'),
    })
    cmds.push({
      id: 'panel-market-pulse',
      label: 'Market Pulse',
      sublabel: 'Daily intelligence snapshot',
      category: 'Market Signals',
      icon: 'PLS',
      action: () => openPanel('market-pulse', 'replace'),
    })

    cmds.push({
      id: 'panel-news-feed',
      label: 'Dubai News',
      sublabel: 'Live Dubai real estate and financial news intelligence',
      category: 'Market Signals',
      icon: 'NWS',
      action: () => openPanel('news-feed', 'replace'),
    })

    // CIE Intelligence commands
    cmds.push({
      id: 'panel-cie-map',
      label: 'Client Map',
      sublabel: 'Global map with archetype markers and CIE score rings',
      category: 'CIE Intelligence',
      icon: 'CIM',
      action: () => openPanel('cie-map', 'replace'),
    })
    cmds.push({
      id: 'panel-cie-grid',
      label: 'Client Grid',
      sublabel: 'Spreadsheet view with all CIE dimensions and intelligence',
      category: 'CIE Intelligence',
      icon: 'CIG',
      action: () => openPanel('cie-grid', 'replace'),
    })
    cmds.push({
      id: 'panel-cie-pipeline',
      label: 'CIE Pipeline',
      sublabel: 'Kanban deal pipeline with cognitive intelligence overlays',
      category: 'CIE Intelligence',
      icon: 'CIPL',
      action: () => openPanel('cie-pipeline', 'replace'),
    })
    cmds.push({
      id: 'panel-prediction-intelligence',
      label: 'Prediction Intelligence',
      sublabel: 'Full AI behavioral pattern analysis with playbooks and projections',
      category: 'CIE Intelligence',
      icon: 'PRI',
      action: () => openPanel('prediction-intelligence', 'replace'),
    })
    cmds.push({
      id: 'panel-relationship-intelligence',
      label: 'Relationship Intelligence',
      sublabel: 'Cross-client relationship mapping and network analysis — Coming Soon',
      category: 'CIE Intelligence',
      icon: 'RLI',
      action: () => openPanel('relationship-intelligence', 'replace'),
    })
    cmds.push({
      id: 'panel-cie-dashboard',
      label: 'CIE Dashboard',
      sublabel: 'E1 power dashboard — profiles, engagement, predictions',
      category: 'CIE Intelligence',
      icon: 'CID',
      action: () => openPanel('cie-dashboard', 'replace'),
    })
    cmds.push({
      id: 'panel-cie-profile',
      label: 'CIE Profile',
      sublabel: 'Client cognitive profiles — 12-dimension analysis',
      category: 'CIE Intelligence',
      icon: 'CIP',
      action: () => openPanel('cie-profile', 'replace'),
    })
    cmds.push({
      id: 'panel-cie-signals',
      label: 'CIE Signals',
      sublabel: 'Real-time behavioural signals and PCISCOM feed',
      category: 'CIE Intelligence',
      icon: 'CIS',
      action: () => openPanel('cie-signals', 'replace'),
    })
    cmds.push({
      id: 'panel-cie-comparator',
      label: 'Client Comparator',
      sublabel: 'Side-by-side multi-client dimension comparison',
      category: 'CIE Intelligence',
      icon: 'CIC',
      action: () => openPanel('cie-comparator', 'replace'),
    })
    cmds.push({
      id: 'panel-cie-engagement',
      label: 'Engagement Intel',
      sublabel: 'Engagement health, decay tracking, momentum analysis',
      category: 'CIE Intelligence',
      icon: 'CIE',
      action: () => openPanel('cie-engagement', 'replace'),
    })
    cmds.push({
      id: 'panel-cie-predictions',
      label: 'Prediction Engine',
      sublabel: 'AI-predicted client behaviour patterns and next moves',
      category: 'CIE Intelligence',
      icon: 'CIF',
      action: () => openPanel('cie-predictions', 'replace'),
    })

    // Quick actions
    cmds.push({
      id: 'action-close-all',
      label: 'Close All Panels',
      sublabel: 'Reset workspace to default',
      category: 'Actions',
      icon: '✕',
      action: () => loadPreset('preset-W1'),
    })
    cmds.push({
      id: 'action-shortcuts',
      label: 'Show Keyboard Shortcuts',
      sublabel: 'View all available shortcuts',
      category: 'Actions',
      icon: '?',
      shortcut: '?',
      action: () => dispatch({ type: 'TOGGLE_SHORTCUTS' }),
    })

    return cmds
  }, [state.presets, openPanel, loadPreset, dispatch])

  // ---------------------------------------------------------------------------
  // Filtered + scored results
  // ---------------------------------------------------------------------------

  const results = useMemo(() => {
    const query = state.commandBarQuery.trim()
    if (!query) {
      // Show recent + panels when empty
      return allCommands.filter(c => c.category === 'Panels' || c.category === 'Workspaces' || c.category === 'Actions').slice(0, 15)
    }

    return allCommands
      .map(cmd => {
        // Bloomberg GO-code: exact match on 3-letter icon code gets top priority (score 500)
        const goCodeMatch = cmd.icon.length >= 2 && query.toUpperCase() === cmd.icon.toUpperCase() ? 500 : 0
        // Also boost partial GO-code prefix matches (e.g., "PL" matches "PLS")
        const goCodePrefix = cmd.icon.length >= 2 && cmd.icon.toUpperCase().startsWith(query.toUpperCase()) && query.length >= 2 ? 200 : 0
        const labelScore = fuzzyMatch(query, cmd.label)
        const sublabelScore = fuzzyMatch(query, cmd.sublabel || '')
        const categoryScore = fuzzyMatch(query, cmd.category)
        return { ...cmd, score: Math.max(goCodeMatch, goCodePrefix, labelScore, sublabelScore, categoryScore) }
      })
      .filter(cmd => cmd.score! > 0)
      .sort((a, b) => b.score! - a.score!)
      .slice(0, 20)
  }, [state.commandBarQuery, allCommands])

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [results.length, state.commandBarQuery])

  // ---------------------------------------------------------------------------
  // Keyboard navigation
  // ---------------------------------------------------------------------------

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, results.length - 1))
      // Scroll into view
      requestAnimationFrame(() => {
        const el = listRef.current?.children[Math.min(selectedIndex + 1, results.length - 1)] as HTMLElement
        el?.scrollIntoView({ block: 'nearest' })
      })
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
      requestAnimationFrame(() => {
        const el = listRef.current?.children[Math.max(selectedIndex - 1, 0)] as HTMLElement
        el?.scrollIntoView({ block: 'nearest' })
      })
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const cmd = results[selectedIndex]
      if (cmd) {
        dispatch({ type: 'ADD_COMMAND_HISTORY', command: cmd.label })
        dispatch({ type: 'CLOSE_COMMAND_BAR' })
        cmd.action()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      dispatch({ type: 'CLOSE_COMMAND_BAR' })
    }
  }

  // ---------------------------------------------------------------------------
  // Group results by category
  // ---------------------------------------------------------------------------

  const groupedResults = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {}
    results.forEach(cmd => {
      if (!groups[cmd.category]) groups[cmd.category] = []
      groups[cmd.category].push(cmd)
    })
    return groups
  }, [results])

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!state.commandBarOpen) return null

  let flatIndex = -1

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => dispatch({ type: 'CLOSE_COMMAND_BAR' })}
      />

      {/* Command Bar */}
      <div className="relative w-[560px] bg-[#0c0c0c] border border-pcis-border/40 rounded-xl shadow-2xl shadow-black/80 overflow-hidden">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 h-12 border-b border-pcis-border/30">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-pcis-gold/60 flex-shrink-0">
            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10.5 10.5L15 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            autoFocus
            placeholder="Search panels, clients, properties, actions..."
            value={state.commandBarQuery}
            onChange={(e) => dispatch({ type: 'SET_COMMAND_QUERY', query: e.target.value })}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-sm text-pcis-text placeholder-pcis-text-muted/50 outline-none"
            spellCheck={false}
          />
          <kbd className="text-[9px] text-pcis-text-muted bg-white/[0.06] px-1.5 py-0.5 rounded border border-pcis-border/20 font-mono">
            {pk('⌘K')}
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[400px] overflow-y-auto py-2">
          {Object.entries(groupedResults).map(([category, items]) => (
            <div key={category}>
              <div className="px-4 pt-2 pb-1">
                <span className="text-[9px] font-semibold text-pcis-text-muted/60 tracking-wider uppercase">{category}</span>
              </div>
              {items.map((cmd) => {
                flatIndex++
                const idx = flatIndex
                const isSelected = idx === selectedIndex
                return (
                  <button
                    key={cmd.id}
                    onClick={() => {
                      dispatch({ type: 'ADD_COMMAND_HISTORY', command: cmd.label })
                      dispatch({ type: 'CLOSE_COMMAND_BAR' })
                      cmd.action()
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                      isSelected ? 'bg-pcis-gold/[0.08]' : 'hover:bg-white/[0.03]'
                    }`}
                  >
                    {/* Icon */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'bg-pcis-gold/15 text-pcis-gold' : 'bg-white/[0.04] text-pcis-text-muted'
                    }`}>
                      <span className="text-[9px] font-bold tracking-wider">{cmd.icon}</span>
                    </div>

                    {/* Label */}
                    <div className="flex-1 min-w-0">
                      <span className={`text-[12px] font-medium block truncate ${isSelected ? 'text-pcis-text' : 'text-pcis-text-secondary'}`}>
                        {cmd.label}
                      </span>
                      {cmd.sublabel && (
                        <span className="text-[10px] text-pcis-text-muted/60 block truncate">{cmd.sublabel}</span>
                      )}
                    </div>

                    {/* Shortcut */}
                    {cmd.shortcut && (
                      <kbd className="text-[9px] text-pcis-text-muted/50 bg-white/[0.04] px-1.5 py-0.5 rounded font-mono flex-shrink-0">
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </button>
                )
              })}
            </div>
          ))}

          {results.length === 0 && (
            <div className="px-4 py-8 text-center">
              <span className="text-[11px] text-pcis-text-muted/50">No results found</span>
            </div>
          )}
        </div>

        {/* Footer hints */}
        <div className="px-4 py-2 border-t border-pcis-border/20 flex items-center gap-4">
          <span className="text-[9px] text-pcis-text-muted/40 flex items-center gap-1">
            <kbd className="bg-white/[0.04] px-1 rounded text-[8px]">↑↓</kbd> navigate
          </span>
          <span className="text-[9px] text-pcis-text-muted/40 flex items-center gap-1">
            <kbd className="bg-white/[0.04] px-1 rounded text-[8px]">↵</kbd> open
          </span>
          <span className="text-[9px] text-pcis-text-muted/40 flex items-center gap-1">
            <kbd className="bg-white/[0.04] px-1 rounded text-[8px]">esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  )
}
