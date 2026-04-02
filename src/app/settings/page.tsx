'use client'

export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <div className="bg-pcis-card/80 backdrop-blur-sm border border-pcis-border rounded-lg p-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-pcis-text-secondary mt-1">Configuration and preferences</p>
      </div>
      <div className="bg-pcis-card/80 backdrop-blur-sm border border-pcis-border rounded-lg p-8 text-center">
        <p className="text-sm text-pcis-text-muted">Settings — coming soon</p>
        <p className="text-xs text-pcis-text-muted/50 mt-2">Engine configuration, notification preferences, API connections, and team management</p>
      </div>
    </div>
  )
}
