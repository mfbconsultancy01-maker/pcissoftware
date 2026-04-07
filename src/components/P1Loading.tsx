'use client'

/**
 * PCIS P1 Loading Screen
 * Shows a branded loading animation while data is being fetched from P1 engines.
 * Uses the PCIS gold/dark theme with a subtle pulse animation.
 */

export function P1Loading({ message = 'Loading intelligence...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-6">
      {/* Animated PCIS logo ring */}
      <div className="relative w-20 h-20">
        <div
          className="absolute inset-0 rounded-full border-2 border-[#C9A84C]/20"
        />
        <div
          className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#C9A84C] animate-spin"
          style={{ animationDuration: '1.2s' }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[#C9A84C] text-xs font-semibold tracking-widest">P1</span>
        </div>
      </div>
      <p className="text-white/40 text-sm tracking-wide">{message}</p>
    </div>
  )
}

export function P1EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: string
  title: string
  description: string
  action?: { label: string; onClick: () => void }
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center px-8">
      {icon && <span className="text-4xl opacity-40">{icon}</span>}
      <h3 className="text-white/70 text-lg font-medium">{title}</h3>
      <p className="text-white/40 text-sm max-w-md">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-2 px-5 py-2 rounded-lg bg-[#C9A84C]/10 border border-[#C9A84C]/30 text-[#C9A84C] text-sm hover:bg-[#C9A84C]/20 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

export function P1ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center px-8">
      <span className="text-4xl opacity-40">⚠</span>
      <h3 className="text-white/70 text-lg font-medium">Connection Issue</h3>
      <p className="text-white/40 text-sm max-w-md">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 px-5 py-2 rounded-lg bg-white/5 border border-white/10 text-white/60 text-sm hover:bg-white/10 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  )
}
