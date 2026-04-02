'use client'

import React from 'react'
import { useWorkspace } from './WorkspaceProvider'
import { usePlatformKey } from '@/lib/platform'

// ============================================================================
// PCIS Keyboard Shortcuts Overlay
// ============================================================================

const shortcuts = [
  { category: 'Navigation', items: [
    { keys: '⌘K', desc: 'Command palette' },
    { keys: '1-9', desc: 'Quick open panel' },
    { keys: '0', desc: 'Morning Brief' },
    { keys: 'Ctrl+Tab', desc: 'Next panel group' },
    { keys: 'Ctrl+Shift+Tab', desc: 'Previous panel group' },
  ]},
  { category: 'Layout', items: [
    { keys: '⌘\\', desc: 'Split right' },
    { keys: '⌘W', desc: 'Close panel' },
    { keys: 'Alt+1-5', desc: 'Load workspace preset' },
  ]},
  { category: 'Workspaces', items: [
    { keys: 'Alt+1', desc: 'Overview' },
    { keys: 'Alt+2', desc: 'Deal Room' },
    { keys: 'Alt+3', desc: 'Market Watch' },
    { keys: 'Alt+4', desc: 'Morning Brief' },
    { keys: 'Alt+5', desc: 'Relationships' },
  ]},
  { category: 'General', items: [
    { keys: '?', desc: 'Toggle this overlay' },
    { keys: 'Esc', desc: 'Close overlay / command bar' },
  ]},
]

export default function ShortcutsOverlay() {
  const { state, dispatch } = useWorkspace()
  const pk = usePlatformKey()

  if (!state.shortcutOverlayVisible) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => dispatch({ type: 'TOGGLE_SHORTCUTS' })}
      />
      <div className="relative w-[520px] bg-[#0c0c0c] border border-pcis-border/40 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-pcis-border/30 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-pcis-text" style={{ fontFamily: "'Playfair Display', serif" }}>
              Keyboard Shortcuts
            </h2>
            <p className="text-[10px] text-pcis-text-muted mt-0.5">PCIS Command Center</p>
          </div>
          <button
            onClick={() => dispatch({ type: 'TOGGLE_SHORTCUTS' })}
            className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10 text-pcis-text-muted"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M1 1l8 8M9 1l-8 8" />
            </svg>
          </button>
        </div>

        {/* Shortcuts Grid */}
        <div className="p-5 grid grid-cols-2 gap-6">
          {shortcuts.map((group) => (
            <div key={group.category}>
              <h3 className="text-[9px] font-semibold text-pcis-gold/70 tracking-wider uppercase mb-2.5">
                {group.category}
              </h3>
              <div className="space-y-1.5">
                {group.items.map((item) => (
                  <div key={item.keys} className="flex items-center justify-between">
                    <span className="text-[11px] text-pcis-text-secondary">{item.desc}</span>
                    <kbd className="text-[9px] text-pcis-text-muted bg-white/[0.06] px-2 py-0.5 rounded border border-pcis-border/20 font-mono min-w-[40px] text-center">
                      {pk(item.keys)}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-pcis-border/20 text-center">
          <span className="text-[9px] text-pcis-text-muted/40">
            Press <kbd className="bg-white/[0.04] px-1 rounded">?</kbd> or <kbd className="bg-white/[0.04] px-1 rounded">Esc</kbd> to close
          </span>
        </div>
      </div>
    </div>
  )
}
