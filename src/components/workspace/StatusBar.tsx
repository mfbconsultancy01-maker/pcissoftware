'use client'

import React from 'react'
import { useWorkspace } from './WorkspaceProvider'
import { usePlatformKey } from '@/lib/platform'
import {
  clients, matches, recommendations, signals,
  advisorPerformance, matchStages, engagementMetrics, marketMetrics
} from '@/lib/mockData'

// ============================================================================
// PCIS Status Bar — Bloomberg-style Bottom Ticker
// ============================================================================
// Always visible. Shows: active deals, pending actions, market pulse,
// engine status, workspace info, keyboard hint.
// ============================================================================

export default function StatusBar() {
  const { state, toggleCommandBar } = useWorkspace()
  const pk = usePlatformKey()

  // Compute live metrics from data
  const activeDeals = matches.filter((m: any) =>
    m.stage !== 'closed' && m.stage !== 'lost'
  ).length
  const pendingActions = recommendations.filter((r: any) =>
    r.urgency === 'Act'
  ).length
  const activeClients = Object.values(engagementMetrics).filter((e: any) =>
    e.status === 'thriving' || e.status === 'active'
  ).length
  const signalCount = signals.length
  const flywheelScore = advisorPerformance?.flyWheelScore || 84

  const allGroups = state.rows.flatMap(r => r.groups)
  const totalPanels = allGroups.reduce((sum, g) => sum + g.panels.length, 0)

  // Workspace preset name
  const presetName = state.activePreset
    ? state.presets.find(p => p.id === state.activePreset)?.name || 'Custom'
    : 'Custom'

  return (
    <div className="h-7 bg-black/80 border-t border-pcis-border/30 flex items-center px-3 gap-0 flex-shrink-0 backdrop-blur-sm">

      {/* Engine Status */}
      <div className="flex items-center gap-1.5 pr-3 border-r border-pcis-border/20">
        <div className="relative">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 absolute inset-0 animate-ping opacity-30" />
        </div>
        <span className="text-[9px] font-medium text-green-400/80">ENGINES LIVE</span>
      </div>

      {/* Metrics Ticker */}
      <div className="flex items-center gap-0 flex-1 overflow-hidden">
        <StatusItem label="CLIENTS" value={`${activeClients}/${clients.length}`} color="text-cyan-400/80" />
        <StatusDivider />
        <StatusItem label="DEALS" value={String(activeDeals)} color="text-green-400/80" />
        <StatusDivider />
        <StatusItem
          label="ACTIONS"
          value={String(pendingActions)}
          color={pendingActions > 0 ? 'text-red-400/80' : 'text-pcis-text-muted'}
          pulse={pendingActions > 0}
        />
        <StatusDivider />
        <StatusItem label="SIGNALS" value={String(signalCount)} color="text-pcis-gold/80" />
        <StatusDivider />
        <StatusItem label="FLYWHEEL" value={`${flywheelScore}`} color="text-pcis-gold/80" />
        <StatusDivider />
        {marketMetrics && (
          <>
            <StatusItem label="DXB IDX" value={(marketMetrics as any).dubaiIndex || '—'} />
            <StatusDivider />
          </>
        )}
      </div>

      {/* Workspace Info */}
      <div className="flex items-center gap-3 pl-2 border-l border-pcis-border/20">
        <span className="text-[9px] text-pcis-text-muted">
          <span className="text-pcis-gold/60">{presetName}</span>
          {' · '}
          {totalPanels} panel{totalPanels !== 1 ? 's' : ''}
        </span>

        {/* Command bar hint */}
        <button
          onClick={toggleCommandBar}
          className="flex items-center gap-1.5 text-[9px] text-pcis-text-muted hover:text-pcis-gold/80 transition-colors"
        >
          <kbd className="bg-white/[0.06] px-1 py-px rounded text-[8px] border border-pcis-border/20 font-mono">{pk('⌘K')}</kbd>
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Status Item
// ---------------------------------------------------------------------------

function StatusItem({ label, value, color, pulse }: {
  label: string
  value: string
  color?: string
  pulse?: boolean
}) {
  return (
    <div className="flex items-center gap-1.5 px-2.5">
      <span className="text-[8px] text-pcis-text-muted/50 tracking-wider font-medium">{label}</span>
      <span className={`text-[10px] font-semibold tabular-nums ${color || 'text-pcis-text-secondary'} ${pulse ? 'animate-pulse' : ''}`}>
        {value}
      </span>
    </div>
  )
}

function StatusDivider() {
  return <div className="w-px h-3 bg-pcis-border/15 flex-shrink-0" />
}
