'use client'

import React from 'react'
import { WorkspaceProvider, PanelShell, CommandBar, StatusBar, ShortcutsOverlay } from '@/components/workspace'

// ============================================================================
// PCIS Workspace — Bloomberg Terminal Mode
// ============================================================================
// The main workspace page. Replaces the standard page-based navigation
// with a multi-panel tiling workspace. All existing pages become panels
// that can be opened, tiled, tabbed, and resized.
// ============================================================================

export default function WorkspacePage() {
  return (
    <WorkspaceProvider>
      <div className="flex flex-col h-full">
        {/* Panel Tiling Area */}
        <PanelShell />
        {/* Status Bar */}
        <StatusBar />
      </div>

      {/* Overlays */}
      <CommandBar />
      <ShortcutsOverlay />
    </WorkspaceProvider>
  )
}
