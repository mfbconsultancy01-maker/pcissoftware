'use client'

import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react'

// ============================================================================
// PCIS Workspace Engine — State Management
// ============================================================================
// Bloomberg-style multi-panel workspace. Manages panels, tabs, splits,
// keyboard focus, command history, and workspace presets.
// ============================================================================

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PanelType =
  | 'dashboard'
  | 'clients'
  | 'client-detail'
  | 'predictions'
  | 'relationships'
  | 'matches'
  | 'match-detail'
  | 'intel'
  | 'reports'
  | 'recommendations'
  | 'performance'
  | 'settings'
  | 'morning-brief'
  | 'properties'
  | 'property-detail'
  | 'area-grid'
  | 'area-profile'
  | 'transaction-feed'
  | 'transaction-detail'
  | 'volume-analysis'
  | 'buyer-demographics'
  | 'top-transactions'
  | 'building-analytics'
  | 'price-map'
  | 'comparables'
  | 'price-trends'
  | 'valuation-matrix'
  | 'price-alerts'
  | 'offplan-feed'
  | 'offplan-detail'
  | 'developer-analytics'
  | 'payment-plans'
  | 'launch-monitor'
  | 'macro-dashboard'
  | 'visa-population'
  | 'economic-indicators'
  | 'regulatory-tracker'
  | 'tourism-demand'
  | 'signal-feed'
  | 'opportunity-radar'
  | 'emerging-areas'
  | 'heat-map'
  | 'market-pulse'
  | 'cie-dashboard'
  | 'cie-profile'
  | 'cie-signals'
  | 'cie-comparator'
  | 'cie-engagement'
  | 'cie-predictions'
  | 'cie-map'
  | 'cie-grid'
  | 'cie-pipeline'
  | 'prediction-intelligence'
  | 'relationship-intelligence'
  | 'engine-dashboard'
  | 'engine-purpose-matrix'
  | 'engine-match-scorer'
  | 'engine-recommendations'
  | 'engine-client-property'
  | 'engine-purpose-trends'
  | 'forge-dashboard'
  | 'forge-deal-brief'
  | 'forge-proposal'
  | 'forge-comm-advisor'
  | 'forge-lifecycle'
  | 'forge-activity-log'
  | 'forge-client-dossier'
  | 'forge-deal-room'
  | 'forge-meeting-prep'
  | 'forge-opportunity-radar'
  | 'scout-dashboard'
  | 'news-feed'
  | 'client-360'
  | 'pipeline'
  | 'notifications'
  | 'command-centre'

export interface Panel {
  id: string
  type: PanelType
  title: string
  icon: string            // Short identifier for tab display
  entityId?: string       // For detail panels (client ID, property ID, etc.)
  closable: boolean
  splitDirection?: 'horizontal' | 'vertical'
}

export interface PanelGroup {
  id: string
  panels: Panel[]         // Stacked tabs within this group
  activePanel: string     // Which panel ID is visible
  widthPercent: number    // Width as percentage of row
}

export interface WorkspaceRow {
  id: string
  groups: PanelGroup[]
  heightPercent: number   // Height as percentage of workspace
}

export interface WorkspacePreset {
  id: string
  name: string
  shortcut: string        // e.g., "W1", "W2"
  rows: WorkspaceRow[]
}

export interface CommandHistoryItem {
  command: string
  timestamp: number
}

export interface WorkspaceState {
  rows: WorkspaceRow[]
  focusedGroupId: string | null
  focusedPanelId: string | null
  commandBarOpen: boolean
  commandBarQuery: string
  commandHistory: CommandHistoryItem[]
  presets: WorkspacePreset[]
  activePreset: string | null
  shortcutOverlayVisible: boolean
  panelCounter: number    // For generating unique IDs
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

type WorkspaceAction =
  | { type: 'OPEN_PANEL'; panel: Omit<Panel, 'id'>; target?: 'replace' | 'tab' | 'split-right' | 'split-below' }
  | { type: 'CLOSE_PANEL'; panelId: string }
  | { type: 'FOCUS_PANEL'; panelId: string; groupId: string }
  | { type: 'FOCUS_GROUP'; groupId: string }
  | { type: 'FOCUS_NEXT_GROUP' }
  | { type: 'FOCUS_PREV_GROUP' }
  | { type: 'SET_ACTIVE_TAB'; groupId: string; panelId: string }
  | { type: 'RESIZE_GROUP'; groupId: string; widthPercent: number }
  | { type: 'RESIZE_ROW'; rowId: string; heightPercent: number }
  | { type: 'TOGGLE_COMMAND_BAR' }
  | { type: 'SET_COMMAND_QUERY'; query: string }
  | { type: 'CLOSE_COMMAND_BAR' }
  | { type: 'ADD_COMMAND_HISTORY'; command: string }
  | { type: 'LOAD_PRESET'; preset: WorkspacePreset }
  | { type: 'SAVE_PRESET'; name: string; shortcut: string }
  | { type: 'SET_ROWS'; rows: WorkspaceRow[] }
  | { type: 'TOGGLE_SHORTCUTS' }
  | { type: 'MOVE_PANEL_TO_GROUP'; panelId: string; fromGroupId: string; toGroupId: string }

// ---------------------------------------------------------------------------
// Panel Registry — maps types to display info
// ---------------------------------------------------------------------------

export const PANEL_REGISTRY: Record<PanelType, { title: string; icon: string; shortcut?: string }> = {
  'dashboard':       { title: 'Dashboard',          icon: 'DSH', shortcut: '1' },
  'clients':         { title: 'Clients',            icon: 'CLI', shortcut: '2' },
  'client-detail':   { title: 'Client',             icon: 'C·D' },
  'intel':           { title: 'Market Intel',        icon: 'INT', shortcut: '3' },
  'matches':         { title: 'Matches',            icon: 'MCH', shortcut: '4' },
  'match-detail':    { title: 'Match',              icon: 'M·D' },
  'predictions':     { title: 'Predictions',        icon: 'PRD', shortcut: '5' },
  'relationships':   { title: 'Relationships',      icon: 'REL', shortcut: '6' },
  'recommendations': { title: 'Recommendations',    icon: 'REC', shortcut: '7' },
  'reports':         { title: 'Reports',            icon: 'RPT', shortcut: '8' },
  'performance':     { title: 'Performance',        icon: 'PRF', shortcut: '9' },
  'properties':      { title: 'Properties',         icon: 'PRP' },
  'property-detail': { title: 'Property',           icon: 'P·D' },
  'settings':        { title: 'Settings',           icon: 'SET' },
  'morning-brief':   { title: 'Morning Brief',      icon: 'BRF', shortcut: '0' },
  'area-grid':           { title: 'Area Intelligence',   icon: 'ARE' },
  'area-profile':        { title: 'Area Profile',        icon: 'A·P' },
  'transaction-feed':    { title: 'Transaction Feed',    icon: 'TXN' },
  'transaction-detail':  { title: 'Transaction',         icon: 'T·D' },
  'volume-analysis':     { title: 'Volume Analysis',     icon: 'VOL' },
  'buyer-demographics':  { title: 'Buyer Demographics',  icon: 'BUY' },
  'top-transactions':    { title: 'Top Transactions',    icon: 'TOP' },
  'building-analytics':  { title: 'Building Analytics',  icon: 'BLD' },
  'price-map':           { title: 'Price Intelligence',   icon: 'PRC' },
  'comparables':         { title: 'Comparables Engine',  icon: 'CMP' },
  'price-trends':        { title: 'Price Trends',        icon: 'TRD' },
  'valuation-matrix':    { title: 'Valuation Matrix',    icon: 'VAL' },
  'price-alerts':        { title: 'Price Alerts',        icon: 'ALT' },
  'offplan-feed':        { title: 'Off-Plan Projects',   icon: 'OFP' },
  'offplan-detail':      { title: 'Project Detail',      icon: 'O·D' },
  'developer-analytics': { title: 'Developer Analytics', icon: 'DEV' },
  'payment-plans':       { title: 'Payment Plans',       icon: 'PAY' },
  'launch-monitor':      { title: 'Launch Monitor',      icon: 'LCH' },
  'macro-dashboard':     { title: 'Macro Intelligence',  icon: 'MCR' },
  'visa-population':     { title: 'Visa & Population',   icon: 'VIS' },
  'economic-indicators': { title: 'Economic Indicators', icon: 'ECO' },
  'regulatory-tracker':  { title: 'Regulatory Tracker',  icon: 'REG' },
  'tourism-demand':      { title: 'Tourism & Demand',    icon: 'TOR' },
  'signal-feed':         { title: 'Market Signals',      icon: 'SIG' },
  'opportunity-radar':   { title: 'Opportunity Radar',   icon: 'OPP' },
  'emerging-areas':      { title: 'Emerging Areas',      icon: 'EMG' },
  'heat-map':            { title: 'Heat Map',            icon: 'HMP' },
  'market-pulse':        { title: 'Market Pulse',        icon: 'PLS' },
  'news-feed':           { title: 'Dubai News',          icon: 'NWS' },
  'cie-dashboard':       { title: 'CIE Dashboard',       icon: 'CID' },
  'cie-profile':         { title: 'CIE Profile',         icon: 'CIP' },
  'cie-signals':         { title: 'CIE Signals',         icon: 'CIS' },
  'cie-comparator':      { title: 'Client Comparator',   icon: 'CIC' },
  'cie-engagement':      { title: 'Engagement Intel',     icon: 'CIE' },
  'cie-predictions':     { title: 'Prediction Engine',    icon: 'CIF' },
  'cie-map':             { title: 'Client Map',           icon: 'CIM' },
  'cie-grid':            { title: 'Client Grid',          icon: 'CIG' },
  'cie-pipeline':            { title: 'CIE Pipeline',         icon: 'CIPL' },
  'prediction-intelligence': { title: 'Prediction Intelligence', icon: 'PRI' },
  'relationship-intelligence': { title: 'Relationship Intelligence', icon: 'RLI' },
  'engine-dashboard':        { title: 'ENGINE Dashboard',      icon: 'ENG' },
  'engine-purpose-matrix':   { title: 'Purpose Matrix',        icon: 'EPM' },
  'engine-match-scorer':     { title: 'Match Scorer',          icon: 'EMS' },
  'engine-recommendations':  { title: 'Recommendations',       icon: 'ERC' },
  'engine-client-property':  { title: 'Client-Property Grid',  icon: 'ECP' },
  'engine-purpose-trends':   { title: 'Purpose Trends',        icon: 'EPT' },
  'forge-dashboard':         { title: 'FORGE Command Centre',  icon: 'FDH' },
  'forge-deal-room':         { title: 'Deal Room',             icon: 'FDR' },
  'forge-meeting-prep':      { title: 'Meeting Prep',          icon: 'FMP' },
  'forge-opportunity-radar': { title: 'Opportunity Radar',     icon: 'FOR' },
  'forge-client-dossier':    { title: 'Client Dossier',        icon: 'FCD' },
  'forge-deal-brief':        { title: 'Deal Briefs',           icon: 'FDB' },
  'forge-proposal':          { title: 'Proposals',             icon: 'FPR' },
  'forge-comm-advisor':      { title: 'Comm Advisor',          icon: 'FCA' },
  'forge-lifecycle':         { title: 'Lifecycle Actions',     icon: 'FCL' },
  'forge-activity-log':      { title: 'Activity Log',          icon: 'FAL' },
  'scout-dashboard':         { title: 'SCOUT Dashboard',       icon: 'SCT' },
  'client-360':              { title: 'Client DNA',             icon: 'C36' },
  'pipeline':                { title: 'Deal Pipeline',         icon: 'PPL' },
  'notifications':           { title: 'Notifications',         icon: 'NTF' },
  'command-centre':          { title: 'Command Centre',        icon: 'CMD' },
}

// ---------------------------------------------------------------------------
// Helper: generate unique ID
// ---------------------------------------------------------------------------
function uid(counter: number): string {
  return `p${counter}-${Date.now().toString(36)}`
}

function groupUid(): string {
  return `g-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

function rowUid(): string {
  return `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

// ---------------------------------------------------------------------------
// Helper: find panel location in workspace
// ---------------------------------------------------------------------------
function findPanel(rows: WorkspaceRow[], panelId: string): { rowIdx: number; groupIdx: number; panelIdx: number } | null {
  for (let ri = 0; ri < rows.length; ri++) {
    for (let gi = 0; gi < rows[ri].groups.length; gi++) {
      const pi = rows[ri].groups[gi].panels.findIndex(p => p.id === panelId)
      if (pi !== -1) return { rowIdx: ri, groupIdx: gi, panelIdx: pi }
    }
  }
  return null
}

function findGroup(rows: WorkspaceRow[], groupId: string): { rowIdx: number; groupIdx: number } | null {
  for (let ri = 0; ri < rows.length; ri++) {
    const gi = rows[ri].groups.findIndex(g => g.id === groupId)
    if (gi !== -1) return { rowIdx: ri, groupIdx: gi }
  }
  return null
}

function getAllGroups(rows: WorkspaceRow[]): PanelGroup[] {
  return rows.flatMap(r => r.groups)
}

// ---------------------------------------------------------------------------
// Default Layout — single dashboard panel
// ---------------------------------------------------------------------------

const defaultPanel: Panel = {
  id: 'p-default',
  type: 'dashboard',
  title: 'Dashboard',
  icon: 'DSH',
  closable: false,
}

const defaultGroup: PanelGroup = {
  id: 'g-default',
  panels: [defaultPanel],
  activePanel: 'p-default',
  widthPercent: 100,
}

const defaultRow: WorkspaceRow = {
  id: 'r-default',
  groups: [defaultGroup],
  heightPercent: 100,
}

// ---------------------------------------------------------------------------
// Workspace Presets
// ---------------------------------------------------------------------------

function createPreset(name: string, shortcut: string, config: Array<{ height: number; panels: Array<{ type: PanelType; width: number }> }>): WorkspacePreset {
  const rows: WorkspaceRow[] = config.map((rowCfg) => ({
    id: rowUid(),
    heightPercent: rowCfg.height,
    groups: rowCfg.panels.map((p) => {
      const reg = PANEL_REGISTRY[p.type]
      const panelId = uid(Math.floor(Math.random() * 10000))
      return {
        id: groupUid(),
        panels: [{
          id: panelId,
          type: p.type,
          title: reg.title,
          icon: reg.icon,
          closable: true,
        }],
        activePanel: panelId,
        widthPercent: p.width,
      }
    }),
  }))
  return { id: `preset-${shortcut}`, name, shortcut, rows }
}

const defaultPresets: WorkspacePreset[] = [
  createPreset('Overview', 'W1', [
    { height: 100, panels: [{ type: 'dashboard', width: 100 }] },
  ]),
  createPreset('Deal Room', 'W2', [
    { height: 100, panels: [
      { type: 'clients', width: 35 },
      { type: 'matches', width: 35 },
      { type: 'recommendations', width: 30 },
    ]},
  ]),
  createPreset('Market Watch', 'W3', [
    { height: 55, panels: [
      { type: 'intel', width: 60 },
      { type: 'predictions', width: 40 },
    ]},
    { height: 45, panels: [
      { type: 'matches', width: 50 },
      { type: 'properties', width: 50 },
    ]},
  ]),
  createPreset('Morning Brief', 'W4', [
    { height: 100, panels: [
      { type: 'morning-brief', width: 40 },
      { type: 'dashboard', width: 60 },
    ]},
  ]),
  createPreset('Relationships', 'W5', [
    { height: 100, panels: [
      { type: 'relationships', width: 50 },
      { type: 'clients', width: 50 },
    ]},
  ]),
]

// ---------------------------------------------------------------------------
// Initial State
// ---------------------------------------------------------------------------

const initialState: WorkspaceState = {
  rows: [defaultRow],
  focusedGroupId: 'g-default',
  focusedPanelId: 'p-default',
  commandBarOpen: false,
  commandBarQuery: '',
  commandHistory: [],
  presets: defaultPresets,
  activePreset: null,
  shortcutOverlayVisible: false,
  panelCounter: 1,
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {

    case 'OPEN_PANEL': {
      const counter = state.panelCounter + 1
      const newPanel: Panel = {
        ...action.panel,
        id: uid(counter),
      }
      const target = action.target || 'tab'
      const rows = JSON.parse(JSON.stringify(state.rows)) as WorkspaceRow[]

      if (target === 'tab' || target === 'replace') {
        // Add as tab in focused group, or first group
        const gId = state.focusedGroupId
        const loc = gId ? findGroup(rows, gId) : null
        if (loc) {
          const group = rows[loc.rowIdx].groups[loc.groupIdx]
          if (target === 'replace') {
            // Replace active panel in group
            const activeIdx = group.panels.findIndex(p => p.id === group.activePanel)
            if (activeIdx !== -1 && group.panels[activeIdx].closable) {
              group.panels[activeIdx] = newPanel
            } else {
              group.panels.push(newPanel)
            }
          } else {
            group.panels.push(newPanel)
          }
          group.activePanel = newPanel.id
        } else {
          // Fallback: add to first group
          rows[0].groups[0].panels.push(newPanel)
          rows[0].groups[0].activePanel = newPanel.id
        }
      } else if (target === 'split-right') {
        // Add as new group in the same row as focused
        const gId = state.focusedGroupId
        const loc = gId ? findGroup(rows, gId) : null
        const rowIdx = loc ? loc.rowIdx : 0
        const row = rows[rowIdx]
        const newWidth = 100 / (row.groups.length + 1)
        row.groups.forEach(g => { g.widthPercent = newWidth })
        const newGroup: PanelGroup = {
          id: groupUid(),
          panels: [newPanel],
          activePanel: newPanel.id,
          widthPercent: newWidth,
        }
        const insertIdx = loc ? loc.groupIdx + 1 : row.groups.length
        row.groups.splice(insertIdx, 0, newGroup)
        return {
          ...state,
          rows,
          focusedGroupId: newGroup.id,
          focusedPanelId: newPanel.id,
          panelCounter: counter,
          activePreset: null,
        }
      } else if (target === 'split-below') {
        // Add as new row below
        const newHeight = 100 / (rows.length + 1)
        rows.forEach(r => { r.heightPercent = newHeight })
        const newGroup: PanelGroup = {
          id: groupUid(),
          panels: [newPanel],
          activePanel: newPanel.id,
          widthPercent: 100,
        }
        rows.push({
          id: rowUid(),
          groups: [newGroup],
          heightPercent: newHeight,
        })
        return {
          ...state,
          rows,
          focusedGroupId: newGroup.id,
          focusedPanelId: newPanel.id,
          panelCounter: counter,
          activePreset: null,
        }
      }

      return {
        ...state,
        rows,
        focusedPanelId: newPanel.id,
        panelCounter: counter,
        activePreset: null,
      }
    }

    case 'CLOSE_PANEL': {
      const rows = JSON.parse(JSON.stringify(state.rows)) as WorkspaceRow[]
      const loc = findPanel(rows, action.panelId)
      if (!loc) return state

      const group = rows[loc.rowIdx].groups[loc.groupIdx]
      const panel = group.panels[loc.panelIdx]
      if (!panel.closable) return state

      group.panels.splice(loc.panelIdx, 1)

      // If group is now empty, remove it
      if (group.panels.length === 0) {
        const row = rows[loc.rowIdx]
        row.groups.splice(loc.groupIdx, 1)

        // If row is now empty, remove it
        if (row.groups.length === 0) {
          rows.splice(loc.rowIdx, 1)
          // Rebalance remaining rows
          if (rows.length > 0) {
            const h = 100 / rows.length
            rows.forEach(r => { r.heightPercent = h })
          }
        } else {
          // Rebalance remaining groups
          const w = 100 / row.groups.length
          row.groups.forEach(g => { g.widthPercent = w })
        }
      } else {
        // Set new active tab
        if (group.activePanel === action.panelId) {
          group.activePanel = group.panels[Math.min(loc.panelIdx, group.panels.length - 1)].id
        }
      }

      // If workspace is completely empty, restore default
      if (rows.length === 0) {
        return { ...initialState, presets: state.presets, commandHistory: state.commandHistory }
      }

      // Update focus
      const allGroups = getAllGroups(rows)
      const focusedGroup = allGroups[0]

      return {
        ...state,
        rows,
        focusedGroupId: focusedGroup?.id || null,
        focusedPanelId: focusedGroup?.activePanel || null,
        activePreset: null,
      }
    }

    case 'FOCUS_PANEL':
      return { ...state, focusedPanelId: action.panelId, focusedGroupId: action.groupId }

    case 'FOCUS_GROUP':
      const targetGroup = getAllGroups(state.rows).find(g => g.id === action.groupId)
      return {
        ...state,
        focusedGroupId: action.groupId,
        focusedPanelId: targetGroup?.activePanel || state.focusedPanelId,
      }

    case 'FOCUS_NEXT_GROUP':
    case 'FOCUS_PREV_GROUP': {
      const allGroups = getAllGroups(state.rows)
      if (allGroups.length <= 1) return state
      const currentIdx = allGroups.findIndex(g => g.id === state.focusedGroupId)
      const delta = action.type === 'FOCUS_NEXT_GROUP' ? 1 : -1
      const nextIdx = (currentIdx + delta + allGroups.length) % allGroups.length
      const next = allGroups[nextIdx]
      return {
        ...state,
        focusedGroupId: next.id,
        focusedPanelId: next.activePanel,
      }
    }

    case 'SET_ACTIVE_TAB': {
      const rows = JSON.parse(JSON.stringify(state.rows)) as WorkspaceRow[]
      const loc = findGroup(rows, action.groupId)
      if (loc) {
        rows[loc.rowIdx].groups[loc.groupIdx].activePanel = action.panelId
      }
      return { ...state, rows, focusedGroupId: action.groupId, focusedPanelId: action.panelId }
    }

    case 'RESIZE_GROUP': {
      const rows = JSON.parse(JSON.stringify(state.rows)) as WorkspaceRow[]
      const loc = findGroup(rows, action.groupId)
      if (loc) {
        rows[loc.rowIdx].groups[loc.groupIdx].widthPercent = action.widthPercent
      }
      return { ...state, rows }
    }

    case 'RESIZE_ROW': {
      const rows = JSON.parse(JSON.stringify(state.rows)) as WorkspaceRow[]
      const ri = rows.findIndex(r => r.id === action.rowId)
      if (ri !== -1) rows[ri].heightPercent = action.heightPercent
      return { ...state, rows }
    }

    case 'TOGGLE_COMMAND_BAR':
      return { ...state, commandBarOpen: !state.commandBarOpen, commandBarQuery: '' }

    case 'SET_COMMAND_QUERY':
      return { ...state, commandBarQuery: action.query }

    case 'CLOSE_COMMAND_BAR':
      return { ...state, commandBarOpen: false, commandBarQuery: '' }

    case 'ADD_COMMAND_HISTORY':
      return {
        ...state,
        commandHistory: [{ command: action.command, timestamp: Date.now() }, ...state.commandHistory].slice(0, 50),
      }

    case 'LOAD_PRESET':
      return {
        ...state,
        rows: JSON.parse(JSON.stringify(action.preset.rows)),
        activePreset: action.preset.id,
        focusedGroupId: action.preset.rows[0]?.groups[0]?.id || null,
        focusedPanelId: action.preset.rows[0]?.groups[0]?.activePanel || null,
      }

    case 'SAVE_PRESET': {
      const newPreset: WorkspacePreset = {
        id: `preset-custom-${Date.now()}`,
        name: action.name,
        shortcut: action.shortcut,
        rows: JSON.parse(JSON.stringify(state.rows)),
      }
      return {
        ...state,
        presets: [...state.presets, newPreset],
        activePreset: newPreset.id,
      }
    }

    case 'SET_ROWS':
      return { ...state, rows: action.rows, activePreset: null }

    case 'TOGGLE_SHORTCUTS':
      return { ...state, shortcutOverlayVisible: !state.shortcutOverlayVisible }

    default:
      return state
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface WorkspaceContextValue {
  state: WorkspaceState
  dispatch: React.Dispatch<WorkspaceAction>
  openPanel: (type: PanelType, target?: 'tab' | 'replace' | 'split-right' | 'split-below', entityId?: string) => void
  closePanel: (panelId: string) => void
  focusPanel: (panelId: string, groupId: string) => void
  toggleCommandBar: () => void
  loadPreset: (presetId: string) => void
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider')
  return ctx
}

/** Safe version — returns null when outside WorkspaceProvider (e.g. standalone pages) */
export function useWorkspaceSafe() {
  return useContext(WorkspaceContext)
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export default function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(workspaceReducer, initialState)

  const openPanel = useCallback((type: PanelType, target?: 'tab' | 'replace' | 'split-right' | 'split-below', entityId?: string) => {
    const reg = PANEL_REGISTRY[type]
    const title = entityId ? `${reg.title}` : reg.title
    dispatch({
      type: 'OPEN_PANEL',
      panel: { type, title, icon: reg.icon, closable: true, entityId },
      target,
    })
  }, [])

  const closePanel = useCallback((panelId: string) => {
    dispatch({ type: 'CLOSE_PANEL', panelId })
  }, [])

  const focusPanel = useCallback((panelId: string, groupId: string) => {
    dispatch({ type: 'FOCUS_PANEL', panelId, groupId })
  }, [])

  const toggleCommandBar = useCallback(() => {
    dispatch({ type: 'TOGGLE_COMMAND_BAR' })
  }, [])

  const loadPreset = useCallback((presetId: string) => {
    const preset = state.presets.find(p => p.id === presetId)
    if (preset) dispatch({ type: 'LOAD_PRESET', preset })
  }, [state.presets])

  // ---- Global Keyboard Shortcuts ----
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey
      const target = e.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

      // ⌘K — Command bar
      if (meta && e.key === 'k') {
        e.preventDefault()
        dispatch({ type: 'TOGGLE_COMMAND_BAR' })
        return
      }

      // Escape — Close command bar or shortcut overlay
      if (e.key === 'Escape') {
        if (state.commandBarOpen) {
          e.preventDefault()
          dispatch({ type: 'CLOSE_COMMAND_BAR' })
          return
        }
        if (state.shortcutOverlayVisible) {
          e.preventDefault()
          dispatch({ type: 'TOGGLE_SHORTCUTS' })
          return
        }
      }

      // Don't capture shortcuts when typing in inputs
      if (isInput) return

      // ? — Toggle shortcuts overlay
      if (e.key === '?') {
        e.preventDefault()
        dispatch({ type: 'TOGGLE_SHORTCUTS' })
        return
      }

      // Number keys 0-9 — Quick open panels
      if (!meta && !e.shiftKey && !e.altKey && /^[0-9]$/.test(e.key)) {
        const entry = Object.entries(PANEL_REGISTRY).find(([, v]) => v.shortcut === e.key)
        if (entry) {
          e.preventDefault()
          const [panelType] = entry
          openPanel(panelType as PanelType, 'replace')
          return
        }
      }

      // Alt+number — Load workspace presets (Alt+1 = W1, etc.)
      if (e.altKey && /^[1-9]$/.test(e.key)) {
        const preset = state.presets.find(p => p.shortcut === `W${e.key}`)
        if (preset) {
          e.preventDefault()
          dispatch({ type: 'LOAD_PRESET', preset })
          return
        }
      }

      // Ctrl+Tab / Ctrl+Shift+Tab — Cycle through groups
      if (e.ctrlKey && e.key === 'Tab') {
        e.preventDefault()
        dispatch({ type: e.shiftKey ? 'FOCUS_PREV_GROUP' : 'FOCUS_NEXT_GROUP' })
        return
      }

      // ⌘W — Close focused panel
      if (meta && e.key === 'w') {
        e.preventDefault()
        if (state.focusedPanelId) closePanel(state.focusedPanelId)
        return
      }

      // ⌘\ — Split right
      if (meta && e.key === '\\') {
        e.preventDefault()
        openPanel('dashboard', 'split-right')
        return
      }

      // ⌘Shift+\ — Split below
      if (meta && e.shiftKey && e.key === '|') {
        e.preventDefault()
        openPanel('dashboard', 'split-below')
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [state.commandBarOpen, state.shortcutOverlayVisible, state.focusedPanelId, state.presets, openPanel, closePanel])

  const value: WorkspaceContextValue = {
    state,
    dispatch,
    openPanel,
    closePanel,
    focusPanel,
    toggleCommandBar,
    loadPreset,
  }

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  )
}
