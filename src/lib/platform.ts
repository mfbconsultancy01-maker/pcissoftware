// Platform detection for keyboard shortcut labels
// Returns true on macOS/iOS, false on Windows/Linux

import { useState, useEffect } from 'react'

let _isMac: boolean | null = null

export function isMac(): boolean {
  if (_isMac !== null) return _isMac
  if (typeof navigator === 'undefined') return true // SSR default to Mac
  _isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform || '') ||
           /Macintosh/.test(navigator.userAgent || '')
  return _isMac
}

/** Convert ⌘ symbols to platform-appropriate labels */
export function platformKey(shortcut: string): string {
  if (isMac()) return shortcut
  return shortcut
    .replace(/⌘⇧/g, 'Ctrl+Shift+')
    .replace(/⌘/g, 'Ctrl+')
}

/** React hook — safe for SSR, resolves on mount */
export function usePlatformKey() {
  const [mac, setMac] = useState(true) // SSR-safe default
  useEffect(() => { setMac(isMac()) }, [])
  return (shortcut: string) => {
    if (mac) return shortcut
    return shortcut
      .replace(/⌘⇧/g, 'Ctrl+Shift+')
      .replace(/⌘/g, 'Ctrl+')
  }
}
