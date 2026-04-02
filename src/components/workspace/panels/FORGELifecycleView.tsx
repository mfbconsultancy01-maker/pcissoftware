'use client'

import React, { useState, useMemo } from 'react'
import {
  lifecycleActions,
  getOverdueLifecycleActions,
  type LifecycleAction,
  type ActionPriority,
} from '@/lib/forgeData'
import { type DealStage, DEAL_STAGES } from '@/lib/mockData'
import { clients } from '@/lib/mockData'
import { ClientLink } from '../useWorkspaceNav'

const priorityColors: Record<ActionPriority, string> = {
  critical: 'bg-red-400',
  high: 'bg-amber-400',
  medium: 'bg-cyan-400',
  low: 'bg-gray-400',
}

const priorityTextColors: Record<ActionPriority, string> = {
  critical: 'text-red-400',
  high: 'text-amber-400',
  medium: 'text-cyan-400',
  low: 'text-gray-400',
}

const phaseColors: Record<DealStage, string> = {
  'Lead In': 'bg-gray-400/20 text-gray-300 border-gray-400/30',
  'Discovery': 'bg-cyan-400/20 text-cyan-300 border-cyan-400/30',
  'Viewing': 'bg-blue-400/20 text-blue-300 border-blue-400/30',
  'Offer Made': 'bg-purple-400/20 text-purple-300 border-purple-400/30',
  'Negotiation': 'bg-amber-400/20 text-amber-300 border-amber-400/30',
  'Closed Won': 'bg-emerald-400/20 text-emerald-300 border-emerald-400/30',
}

const actionTypeLabels: Record<string, string> = {
  'scheduled-touch': 'Scheduled Touch',
  'overdue-follow-up': 'Overdue Follow-up',
  're-engagement': 'Re-engagement',
  'milestone': 'Milestone',
  'nurture': 'Nurture',
}

export default function FORGELifecycleView(): React.ReactElement {
  const [phaseFilter, setPhaseFilter] = useState<DealStage | 'all'>('all')

  const summary = useMemo(() => {
    const overdue = getOverdueLifecycleActions().length
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]
    const todayStr = today.toISOString().split('T')[0]

    const todayActions = lifecycleActions.filter((l: LifecycleAction) => l.dueDate === todayStr)
    const weekFromNow = new Date(today)
    weekFromNow.setDate(weekFromNow.getDate() + 7)
    const weekStr = weekFromNow.toISOString().split('T')[0]
    const upcomingWeek = lifecycleActions.filter((l: LifecycleAction) => {
      const due = new Date(l.dueDate)
      const todayDate = new Date(todayStr)
      const weekDate = new Date(weekStr)
      return due > todayDate && due <= weekDate
    })

    return { overdue, todayActions: todayActions.length, upcomingWeek: upcomingWeek.length }
  }, [])

  const filteredActions = useMemo(() => {
    let results = lifecycleActions
    if (phaseFilter !== 'all') {
      results = results.filter((a: LifecycleAction) => a.phase === phaseFilter)
    }
    return results.sort((a: LifecycleAction, b: LifecycleAction) => {
      const urgencyOrder: Record<ActionPriority, number> = {
        critical: 0,
        high: 1,
        medium: 2,
        low: 3,
      }
      const urgencyDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency]
      if (urgencyDiff !== 0) return urgencyDiff
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    })
  }, [phaseFilter])

  const getClient = (clientId: string) => clients.find((c: any) => c.id === clientId)

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0 pb-3 border-b border-pcis-border/10">
        <div>
          <h2 className="text-lg font-semibold text-pcis-text tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
            Client Lifecycle Actions
          </h2>
          <p className="text-[10px] text-pcis-text-muted tracking-wider uppercase mt-0.5">
            Operational Pipeline
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="flex-shrink-0 py-3 border-b border-pcis-border/10 grid grid-cols-4 gap-2 px-0">
        <div className="text-center">
          <span className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider block">Overdue</span>
          <span className="text-[11px] font-bold text-red-400 block mt-0.5 tabular-nums">{summary.overdue}</span>
        </div>
        <div className="text-center">
          <span className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider block">Today</span>
          <span className="text-[11px] font-bold text-amber-400 block mt-0.5 tabular-nums">{summary.todayActions}</span>
        </div>
        <div className="text-center">
          <span className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider block">This Week</span>
          <span className="text-[11px] font-bold text-cyan-400 block mt-0.5 tabular-nums">{summary.upcomingWeek}</span>
        </div>
        <div className="text-center">
          <span className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider block">Total</span>
          <span className="text-[11px] font-bold text-white/90 block mt-0.5 tabular-nums">{lifecycleActions.length}</span>
        </div>
      </div>

      {/* Phase Filter */}
      <div className="flex-shrink-0 py-3 border-b border-pcis-border/10 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider">Phase</span>
          <div className="flex gap-1.5 flex-wrap overflow-x-auto pb-1">
            {(['all', ...DEAL_STAGES] as const).map((phase: DealStage | 'all') => (
              <button
                key={phase}
                onClick={() => setPhaseFilter(phase)}
                className={`px-2.5 py-1 text-[9px] font-medium uppercase tracking-wider rounded transition-all flex-shrink-0 ${
                  phaseFilter === phase
                    ? 'bg-pcis-gold/20 text-pcis-gold border border-pcis-gold/50'
                    : 'bg-white/[0.02] text-white/70 border border-white/[0.04] hover:bg-white/[0.04]'
                }`}
              >
                {phase}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0 py-3 pr-2 space-y-2">
        {filteredActions.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-2">
              <p className="text-white/40 text-[10px] uppercase tracking-wider">No actions found for selected phase</p>
              <p className="text-white/20 text-[9px]">Try adjusting your selection</p>
            </div>
          </div>
        ) : (
          filteredActions.map((action: LifecycleAction) => {
            const client = getClient(action.clientId)
            const dueDate = new Date(action.dueDate)
            const isOverdue = action.isOverdue

            return (
              <div
                key={action.id}
                className={`p-3 rounded-lg border transition-all bg-white/[0.02] border-white/[0.04] ${
                  isOverdue
                    ? 'border-l-2 border-l-red-400 bg-red-400/5 border-red-400/20'
                    : 'hover:border-white/[0.08]'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Priority Dot */}
                  <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${priorityColors[action.urgency]}`} />

                  {/* Client & Title */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <ClientLink clientId={action.clientId} className="text-[9px] font-medium">
                        {client?.name || 'Unknown'}
                      </ClientLink>
                    </div>
                    <p className="text-[8px] text-white/70">{action.title}</p>
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-2 flex-wrap justify-end flex-shrink-0 text-[8px]">
                    <span className={`px-2 py-1 rounded border ${phaseColors[action.phase]}`}>
                      {action.phase}
                    </span>
                    <span className="px-2 py-1 rounded border bg-white/[0.02] border-white/[0.04] text-white/60">
                      {actionTypeLabels[action.actionType] || action.actionType}
                    </span>
                    <span className={`px-2 py-1 rounded border ${
                      isOverdue
                        ? 'text-red-400 border-red-400/30 bg-red-400/10'
                        : 'text-white/50 border-white/[0.04]'
                    }`}>
                      {dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="px-2 py-1 rounded border bg-white/[0.02] border-white/[0.04] text-white/60">
                      {action.daysSinceLastContact}d
                    </span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
