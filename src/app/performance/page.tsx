'use client'

export default function PerformancePage() {
  return (
    <div className="space-y-4">
      <div className="bg-pcis-card/80 backdrop-blur-sm border border-pcis-border rounded-lg p-6">
        <h1 className="text-2xl font-bold">My Performance</h1>
        <p className="text-sm text-pcis-text-secondary mt-1">Your flywheel score and advisor impact metrics</p>
      </div>
      <div className="bg-pcis-card/80 backdrop-blur-sm border border-pcis-border rounded-lg p-8 text-center">
        <p className="text-sm text-pcis-text-muted">Performance Dashboard — coming soon</p>
        <p className="text-xs text-pcis-text-muted/50 mt-2">Flywheel score, signals fed, actions taken, conversion rate, and weekly performance trends</p>
      </div>
    </div>
  )
}
