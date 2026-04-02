'use client'

import { useMemo } from 'react'
import {
  clients,
  getClient,
  getProperty,
  engagementMetrics,
  type EngagementMetrics,
} from '@/lib/mockData'
import { getCIEClient } from '@/lib/cieData'
import { engineMatches, getEngineMatchesForClient, PURPOSE_CONFIGS, type EngineMatch } from '@/lib/engineData'
import { getArea, areas } from '@/lib/marketData'
import { forgeActions, getCriticalActions, getForgeSummary } from '@/lib/forgeData'

// ── Colour Utilities ────────────────────────────────────────────────────────

const GRADE_COLORS: Record<string, string> = {
  'A+': '#22c55e', // emerald-400
  'A': '#16a34a',  // green-400
  'B+': '#06b6d4', // cyan-400
  'B': '#3b82f6',  // blue-400
  'C': '#f59e0b', // amber-400
  'D': '#ef4444',  // red-400
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f59e0b',
  medium: '#06b6d4',
  low: '#6b7280',
}

const PURPOSE_COLOURS: Record<string, string> = {
  'Investment': '#D4A574',
  'End-Use': '#3B82F6',
  'Family Office': '#8B5CF6',
  'Renovation': '#F59E0B',
  'Golden Visa': '#14B8A6',
  'Pied-à-Terre': '#EC4899',
}

function getPurposeColour(purpose: string): string {
  return PURPOSE_COLOURS[purpose as keyof typeof PURPOSE_COLOURS] || '#6b7280'
}

// ── Stat Card Component ─────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <div className="text-white/40 text-[8px] uppercase tracking-widest font-medium">{label}</div>
      <div className="text-white/90 text-[16px] font-semibold">{value}</div>
    </div>
  )
}

// ── Stats Bar ───────────────────────────────────────────────────────────────

function StatsBar() {
  const stats = useMemo(() => {
    const activeMatches = engineMatches.filter(m => m.status === 'active').length
    const aPlusMatches = engineMatches.filter(m => m.grade === 'A+').length
    const avgMatchScore = engineMatches.length > 0
      ? Math.round(engineMatches.reduce((sum, m) => sum + m.overallScore, 0) / engineMatches.length)
      : 0
    const activeClients = new Set(
      engineMatches
        .filter(m => m.status === 'active')
        .map(m => m.clientId)
    ).size
    const criticalActionsCount = getCriticalActions().length
    const aiBriefsCount = 0 // Placeholder

    return {
      activeMatches,
      aPlusMatches,
      avgMatchScore,
      activeClients,
      criticalActionsCount,
      aiBriefsCount,
    }
  }, [])

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-4 grid grid-cols-6 gap-4">
      <StatCard label="Active Matches" value={stats.activeMatches} />
      <StatCard label="A+ Grade Matches" value={stats.aPlusMatches} />
      <StatCard label="Avg Match Score" value={stats.avgMatchScore} />
      <StatCard label="Active Clients" value={stats.activeClients} />
      <StatCard label="Critical Actions" value={stats.criticalActionsCount} />
      <StatCard label="AI Briefs Generated" value={stats.aiBriefsCount} />
    </div>
  )
}

// ── Priority Actions Panel ──────────────────────────────────────────────────

function PriorityActionsPanel() {
  const sortedActions = useMemo(() => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    return [...forgeActions]
      .sort((a, b) => {
        const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 999
        const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 999
        return aPriority - bPriority
      })
      .slice(0, 8)
  }, [])

  return (
    <div className="mt-6">
      <h2 className="text-[9px] font-semibold text-white/80 uppercase tracking-wider border-l-2 border-[#f59e0b] pl-2 mb-3">
        Priority Actions
      </h2>
      <div className="space-y-2">
        {sortedActions.map(action => {
          const client = getClient(action.clientId)
          const dotColour = PRIORITY_COLORS[action.priority as keyof typeof PRIORITY_COLORS]

          return (
            <div
              key={action.id}
              className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3 flex items-start gap-2 text-[8px]"
            >
              <div
                className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1"
                style={{ backgroundColor: dotColour }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-white/90 font-medium truncate">{action.title}</div>
                <div className="flex gap-2 mt-1 flex-wrap items-center">
                  <span className="text-white/60">{client?.name || 'Unknown'}</span>
                  <span
                    className="px-1.5 py-0.5 rounded text-[7px] font-medium uppercase tracking-wider"
                    style={{
                      backgroundColor: `${getPurposeColour(action.category)}15`,
                      color: getPurposeColour(action.category),
                    }}
                  >
                    {action.category}
                  </span>
                  <span className="text-white/40 ml-auto flex-shrink-0">
                    {new Date(action.dueDate).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Grade Distribution ──────────────────────────────────────────────────────

function GradeDistribution() {
  const grades = useMemo(() => {
    const gradeList = ['A+', 'A', 'B+', 'B', 'C', 'D'] as const
    const distribution = gradeList.map(grade => {
      const count = engineMatches.filter(m => m.grade === grade).length
      return { grade, count }
    })
    const total = distribution.reduce((sum, g) => sum + g.count, 0)
    return distribution.map(g => ({
      ...g,
      percentage: total > 0 ? (g.count / total) * 100 : 0,
    }))
  }, [])

  return (
    <div>
      <h3 className="text-[9px] font-semibold text-white/80 uppercase tracking-wider mb-2">Grade Distribution</h3>
      <div className="space-y-1.5">
        {grades.map(g => (
          <div key={g.grade} className="flex items-center gap-2 text-[8px]">
            <span className="w-6 text-white/60">{g.grade}</span>
            <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full"
                style={{
                  width: `${g.percentage}%`,
                  backgroundColor: GRADE_COLORS[g.grade],
                }}
              />
            </div>
            <span className="w-8 text-white/40 text-right">{g.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Purpose Breakdown ───────────────────────────────────────────────────────

function PurposeBreakdown() {
  const purposeData = useMemo(() => {
    const purposeMap: Record<string, number> = {}
    engineMatches.forEach(match => {
      const purpose = match.purpose
      purposeMap[purpose] = (purposeMap[purpose] || 0) + 1
    })
    return Object.entries(purposeMap)
      .map(([purpose, count]) => ({ purpose, count }))
      .sort((a, b) => b.count - a.count)
  }, [])

  return (
    <div>
      <h3 className="text-[9px] font-semibold text-white/80 uppercase tracking-wider mb-2">Purpose Breakdown</h3>
      <div className="space-y-1.5">
        {purposeData.map(pd => (
          <div key={pd.purpose} className="flex items-center gap-2 text-[8px]">
            <div
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: getPurposeColour(pd.purpose) }}
            />
            <span className="text-white/70 flex-1 truncate">{pd.purpose}</span>
            <span className="text-white/40 font-mono">{pd.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Market Hotspots ────────────────────────────────────────────────────────

function MarketHotspots() {
  const hotspots = useMemo(() => {
    return areas
      .sort((a, b) => b.demandScore - a.demandScore)
      .slice(0, 5)
      .map(area => ({
        name: area.name,
        demandScore: area.demandScore,
        outlook: area.outlook,
      }))
  }, [])

  return (
    <div>
      <h3 className="text-[9px] font-semibold text-white/80 uppercase tracking-wider mb-2">Market Hotspots</h3>
      <div className="space-y-1.5">
        {hotspots.map(hs => (
          <div key={hs.name} className="space-y-0.5">
            <div className="flex items-center justify-between text-[8px]">
              <span className="text-white/70">{hs.name}</span>
              <span className="text-white/40">{hs.demandScore}/100</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#f59e0b]"
                  style={{ width: `${hs.demandScore}%` }}
                />
              </div>
              <span
                className="text-[7px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: hs.outlook === 'bullish' ? '#22c55e15' : hs.outlook === 'bearish' ? '#ef444415' : '#06b6d415',
                  color: hs.outlook === 'bullish' ? '#22c55e' : hs.outlook === 'bearish' ? '#ef4444' : '#06b6d4',
                }}
              >
                {hs.outlook}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Engagement Alerts ───────────────────────────────────────────────────────

function EngagementAlerts() {
  const alerts = useMemo(() => {
    return engagementMetrics
      .filter(em => em.momentum === 'cooling' || em.engagementScore < 40)
      .sort((a, b) => a.engagementScore - b.engagementScore)
      .slice(0, 5)
  }, [])

  return (
    <div>
      <h3 className="text-[9px] font-semibold text-white/80 uppercase tracking-wider mb-2">Engagement Alerts</h3>
      <div className="space-y-1.5">
        {alerts.length === 0 ? (
          <div className="text-[8px] text-white/40 py-1">No critical engagement alerts</div>
        ) : (
          alerts.map(alert => {
            const client = clients.find(c => c.id === alert.clientId)
            const momentumArrow = alert.momentum === 'heating' ? '↑' : alert.momentum === 'cooling' ? '↓' : '→'
            const momentumColour = alert.momentum === 'heating' ? '#22c55e' : alert.momentum === 'cooling' ? '#ef4444' : '#06b6d4'

            return (
              <div key={alert.clientId} className="flex items-center justify-between text-[8px]">
                <span className="text-white/70">{client?.name || 'Unknown'}</span>
                <div className="flex items-center gap-2">
                  <div className="h-1 bg-white/[0.06] rounded-full w-12 overflow-hidden">
                    <div
                      className="h-full bg-[#f59e0b]"
                      style={{ width: `${alert.engagementScore}%` }}
                    />
                  </div>
                  <span style={{ color: momentumColour }} className="font-bold">
                    {momentumArrow}
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ── Recent Match Activity ───────────────────────────────────────────────────

function RecentMatchActivity() {
  const recentMatches = useMemo(() => {
    return [...engineMatches]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)
  }, [])

  return (
    <div className="mt-6">
      <h2 className="text-[9px] font-semibold text-white/80 uppercase tracking-wider border-l-2 border-[#f59e0b] pl-2 mb-3">
        Recent Match Activity
      </h2>
      <div className="space-y-1">
        {recentMatches.map(match => {
          const client = getClient(match.clientId)
          const property = getProperty(match.propertyId)
          const area = match.areaId ? getArea(match.areaId) : null
          const propertyName = property?.name || area?.name || match.propertyId

          return (
            <div
              key={match.id}
              className="bg-white/[0.02] border border-white/[0.06] rounded px-3 py-2 flex items-center gap-2 text-[7px]"
            >
              <span className="text-white/60 truncate w-20">{client?.name || 'Unknown'}</span>
              <span className="text-white/40">·</span>
              <span className="text-white/60 truncate flex-1">{propertyName}</span>
              <span
                className="font-mono font-semibold px-1.5 py-0.5 rounded"
                style={{ color: GRADE_COLORS[match.grade] }}
              >
                {match.overallScore}
              </span>
              <span
                className="px-1 py-0.5 rounded text-[6px] font-medium uppercase tracking-wider"
                style={{
                  backgroundColor: `${GRADE_COLORS[match.grade]}20`,
                  color: GRADE_COLORS[match.grade],
                }}
              >
                {match.grade}
              </span>
              <span
                className="px-1 py-0.5 rounded text-[6px] font-medium uppercase tracking-wider"
                style={{
                  backgroundColor: `${getPurposeColour(match.purpose)}15`,
                  color: getPurposeColour(match.purpose),
                }}
              >
                {match.purpose.slice(0, 3)}
              </span>
              <span className="text-white/40">
                {new Date(match.createdAt).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Quick Navigation Cards ──────────────────────────────────────────────────

function QuickNavCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3 hover:border-[#f59e0b] transition-colors cursor-pointer">
      <div className="text-[12px] font-bold text-[#f59e0b] mb-1">{icon}</div>
      <h4 className="text-[9px] font-semibold text-white/90 mb-1">{title}</h4>
      <p className="text-[7px] text-white/50">{description}</p>
    </div>
  )
}

function QuickNavCards() {
  const cards = [
    {
      icon: 'DR',
      title: 'Deal Room',
      description: 'Central hub for all active deals and negotiations',
    },
    {
      icon: 'MP',
      title: 'Meeting Prep',
      description: 'Pre-meeting briefs and conversation strategies',
    },
    {
      icon: 'OR',
      title: 'Opportunity Radar',
      description: 'Emerging deals and market opportunities',
    },
    {
      icon: 'CD',
      title: 'Client Dossier',
      description: 'Comprehensive client history and preferences',
    },
  ]

  return (
    <div className="mt-6">
      <h2 className="text-[9px] font-semibold text-white/80 uppercase tracking-wider border-l-2 border-[#f59e0b] pl-2 mb-3">
        Quick Navigation
      </h2>
      <div className="grid grid-cols-4 gap-3">
        {cards.map((card, idx) => (
          <QuickNavCard
            key={idx}
            icon={card.icon}
            title={card.title}
            description={card.description}
          />
        ))}
      </div>
    </div>
  )
}

// ── Main Dashboard Component ────────────────────────────────────────────────

export default function FORGEDashboardNewView() {
  return (
    <div className="h-full flex flex-col overflow-y-auto bg-black">
      <div className="px-6 py-6 space-y-6">
        {/* Stats Bar */}
        <StatsBar />

        {/* Priority Actions Panel */}
        <PriorityActionsPanel />

        {/* Pipeline Intelligence Grid */}
        <div className="mt-6">
          <h2 className="text-[9px] font-semibold text-white/80 uppercase tracking-wider border-l-2 border-[#f59e0b] pl-2 mb-3">
            Pipeline Intelligence
          </h2>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <GradeDistribution />
              <PurposeBreakdown />
            </div>
            <div className="space-y-4">
              <MarketHotspots />
              <EngagementAlerts />
            </div>
          </div>
        </div>

        {/* Recent Match Activity */}
        <RecentMatchActivity />

        {/* Quick Navigation Cards */}
        <QuickNavCards />
      </div>
    </div>
  )
}
