'use client'

import React, { useState, useRef, useCallback } from 'react'
import { useWorkspace, PanelGroup, WorkspaceRow, Panel, PANEL_REGISTRY, PanelType } from './WorkspaceProvider'
import PanelRenderer from './PanelRenderer'

// ============================================================================
// PCIS Panel Shell — Bloomberg-style Tiling Layout
// ============================================================================
// Renders the workspace rows → groups → tabbed panels.
// Handles: tab bar, panel focus ring, resize handles, panel chrome.
// ============================================================================

// ---------------------------------------------------------------------------
// Panel Tab Bar
// ---------------------------------------------------------------------------

function PanelTabBar({ group, isFocused }: { group: PanelGroup; isFocused: boolean }) {
  const { dispatch, closePanel, openPanel } = useWorkspace()

  return (
    <div className={`flex items-center h-8 border-b ${
      isFocused ? 'border-pcis-gold/30 bg-pcis-gold/[0.04]' : 'border-pcis-border/40 bg-black/40'
    } backdrop-blur-sm flex-shrink-0`}>
      {/* Tabs */}
      <div className="flex-1 flex items-center overflow-x-auto no-scrollbar">
        {group.panels.map((panel) => {
          const isActive = panel.id === group.activePanel
          return (
            <button
              key={panel.id}
              onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', groupId: group.id, panelId: panel.id })}
              onMouseDown={() => dispatch({ type: 'FOCUS_GROUP', groupId: group.id })}
              className={`flex items-center gap-1.5 px-3 h-full text-[10px] font-medium tracking-wide border-r border-pcis-border/20 transition-colors whitespace-nowrap ${
                isActive
                  ? isFocused
                    ? 'text-pcis-gold bg-pcis-gold/[0.08]'
                    : 'text-pcis-text bg-white/[0.04]'
                  : 'text-pcis-text-muted hover:text-pcis-text-secondary hover:bg-white/[0.02]'
              }`}
            >
              <span className={`text-[9px] font-bold tracking-wider ${isActive && isFocused ? 'text-pcis-gold' : ''}`}>
                {panel.icon}
              </span>
              <span className="max-w-[100px] truncate">{panel.title}</span>
              {panel.entityId && (
                <span className="text-[8px] text-pcis-text-muted/60">#{panel.entityId.slice(0, 4)}</span>
              )}
              {panel.closable && (
                <span
                  onClick={(e) => { e.stopPropagation(); closePanel(panel.id) }}
                  className="ml-1 w-3.5 h-3.5 rounded flex items-center justify-center hover:bg-white/10 text-pcis-text-muted hover:text-pcis-text transition-colors cursor-pointer"
                >
                  <svg width="7" height="7" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M1 1l6 6M7 1l-6 6" />
                  </svg>
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Panel Actions */}
      <div className="flex items-center gap-0.5 px-1.5 flex-shrink-0">
        {/* Split Right */}
        <button
          onClick={() => {
            dispatch({ type: 'FOCUS_GROUP', groupId: group.id })
            openPanel('dashboard', 'split-right')
          }}
          className="w-5 h-5 rounded flex items-center justify-center hover:bg-white/10 text-pcis-text-muted hover:text-pcis-text transition-colors"
          title="Split Right (⌘\)"
        >
          <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
            <rect x="0.5" y="0.5" width="9" height="9" rx="1" />
            <line x1="5" y1="0.5" x2="5" y2="9.5" />
          </svg>
        </button>
        {/* Add Tab */}
        <button
          onClick={() => {
            dispatch({ type: 'FOCUS_GROUP', groupId: group.id })
            openPanel('dashboard', 'tab')
          }}
          className="w-5 h-5 rounded flex items-center justify-center hover:bg-white/10 text-pcis-text-muted hover:text-pcis-text transition-colors"
          title="New Tab"
        >
          <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M5 1v8M1 5h8" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Vertical Resize Handle (between groups in a row)
// ---------------------------------------------------------------------------

function VerticalResizeHandle({ rowIdx, groupIdx }: { rowIdx: number; groupIdx: number }) {
  const { state, dispatch } = useWorkspace()
  const [dragging, setDragging] = useState(false)
  const startX = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setDragging(true)
    startX.current = e.clientX

    const container = (e.target as HTMLElement).closest('[data-row]') as HTMLElement
    if (!container) return

    const containerWidth = container.offsetWidth
    const row = state.rows[rowIdx]
    const leftGroup = row.groups[groupIdx]
    const rightGroup = row.groups[groupIdx + 1]
    const startLeftWidth = leftGroup.widthPercent
    const startRightWidth = rightGroup.widthPercent

    const handleMouseMove = (ev: MouseEvent) => {
      const deltaX = ev.clientX - startX.current
      const deltaPct = (deltaX / containerWidth) * 100
      const newLeft = Math.max(15, Math.min(85, startLeftWidth + deltaPct))
      const newRight = startLeftWidth + startRightWidth - newLeft

      if (newRight >= 15) {
        dispatch({ type: 'RESIZE_GROUP', groupId: leftGroup.id, widthPercent: newLeft })
        dispatch({ type: 'RESIZE_GROUP', groupId: rightGroup.id, widthPercent: newRight })
      }
    }

    const handleMouseUp = () => {
      setDragging(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [state.rows, rowIdx, groupIdx, dispatch])

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      className={`w-1 cursor-col-resize flex-shrink-0 relative group transition-colors ${
        dragging ? 'bg-pcis-gold/40' : 'bg-pcis-border/20 hover:bg-pcis-gold/20'
      }`}
    >
      <div className="absolute inset-y-0 -left-1 -right-1" /> {/* Wider hit area */}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Horizontal Resize Handle (between rows)
// ---------------------------------------------------------------------------

function HorizontalResizeHandle({ rowIdx }: { rowIdx: number }) {
  const { state, dispatch } = useWorkspace()
  const [dragging, setDragging] = useState(false)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setDragging(true)

    const container = (e.target as HTMLElement).closest('[data-workspace]') as HTMLElement
    if (!container) return

    const containerHeight = container.offsetHeight
    const topRow = state.rows[rowIdx]
    const bottomRow = state.rows[rowIdx + 1]
    const startTopHeight = topRow.heightPercent
    const startBottomHeight = bottomRow.heightPercent
    const startY = e.clientY

    const handleMouseMove = (ev: MouseEvent) => {
      const deltaY = ev.clientY - startY
      const deltaPct = (deltaY / containerHeight) * 100
      const newTop = Math.max(20, Math.min(80, startTopHeight + deltaPct))
      const newBottom = startTopHeight + startBottomHeight - newTop

      if (newBottom >= 20) {
        dispatch({ type: 'RESIZE_ROW', rowId: topRow.id, heightPercent: newTop })
        dispatch({ type: 'RESIZE_ROW', rowId: bottomRow.id, heightPercent: newBottom })
      }
    }

    const handleMouseUp = () => {
      setDragging(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [state.rows, rowIdx, dispatch])

  return (
    <div
      onMouseDown={handleMouseDown}
      className={`h-1 cursor-row-resize flex-shrink-0 relative group transition-colors ${
        dragging ? 'bg-pcis-gold/40' : 'bg-pcis-border/20 hover:bg-pcis-gold/20'
      }`}
    >
      <div className="absolute inset-x-0 -top-1 -bottom-1" /> {/* Wider hit area */}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Panel Group Component
// ---------------------------------------------------------------------------

function PanelGroupView({ group, isFocused }: { group: PanelGroup; isFocused: boolean }) {
  const { dispatch } = useWorkspace()
  const activePanel = group.panels.find(p => p.id === group.activePanel) || group.panels[0]

  return (
    <div
      className={`flex flex-col h-full rounded-lg overflow-hidden border transition-colors ${
        isFocused
          ? 'border-pcis-gold/25 shadow-[0_0_12px_rgba(212,165,116,0.06)]'
          : 'border-pcis-border/20'
      }`}
      style={{ width: `${group.widthPercent}%` }}
      onMouseDown={() => dispatch({ type: 'FOCUS_GROUP', groupId: group.id })}
    >
      <PanelTabBar group={group} isFocused={isFocused} />
      <div className="flex-1 overflow-hidden bg-black/20 backdrop-blur-sm">
        {activePanel && <PanelRenderer panel={activePanel} />}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Workspace Shell
// ---------------------------------------------------------------------------

export default function PanelShell() {
  const { state } = useWorkspace()

  return (
    <div className="flex-1 flex flex-col overflow-hidden" data-workspace>
      {state.rows.map((row, rowIdx) => (
        <React.Fragment key={row.id}>
          {rowIdx > 0 && <HorizontalResizeHandle rowIdx={rowIdx - 1} />}
          <div
            className="flex gap-0 overflow-hidden"
            style={{ height: `${row.heightPercent}%` }}
            data-row
          >
            {row.groups.map((group, groupIdx) => (
              <React.Fragment key={group.id}>
                {groupIdx > 0 && <VerticalResizeHandle rowIdx={rowIdx} groupIdx={groupIdx - 1} />}
                <PanelGroupView
                  group={group}
                  isFocused={group.id === state.focusedGroupId}
                />
              </React.Fragment>
            ))}
          </div>
        </React.Fragment>
      ))}
    </div>
  )
}
