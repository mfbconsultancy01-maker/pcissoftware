'use client'

import React, { useState, useMemo } from 'react'
import {
  getDecayAlerts,
  getHotPredictions,
  getActRecommendations,
  getOverdueClients,
  intelFeed,
  type Signal,
  type IntelFeedItem,
  type Prediction,
  type Recommendation,
} from '@/lib/mockData'
import { getCriticalActions, getOverdueLifecycleActions, type ForgeAction, type LifecycleAction } from '@/lib/forgeData'
import { engineMatches, type EngineMatch } from '@/lib/engineData'
import { useWorkspaceNav, ClientLink } from '../useWorkspaceNav'

// ============================================================================
// TYPES
// ============================================================================

type NotificationSource = 'CIE' | 'SCOUT' | 'ENGINE' | 'FORGE'
type NotificationPriority = 'critical' | 'high' | 'medium' | 'low'

interface Notification {
  id: string
  source: NotificationSource
  priority: NotificationPriority
  title: string
  description: string
  clientId?: string
  timestamp: string
  category: string
}

type PriorityFilter = NotificationPriority | null
type SourceFilter = NotificationSource | null

// ============================================================================
// COLOR & ICON UTILITIES
// ============================================================================

const getSourceColor = (source: NotificationSource): string => {
  switch (source) {
    case 'CIE': return 'text-cyan-400'
    case 'SCOUT': return 'text-emerald-400'
    case 'ENGINE': return 'text-purple-400'
    case 'FORGE': return 'text-amber-400'
    default: return 'text-white/70'
  }
}

const getSourceBgColor = (source: NotificationSource): string => {
  switch (source) {
    case 'CIE': return 'bg-cyan-400/10 border border-cyan-400/30'
    case 'SCOUT': return 'bg-emerald-400/10 border border-emerald-400/30'
    case 'ENGINE': return 'bg-purple-400/10 border border-purple-400/30'
    case 'FORGE': return 'bg-amber-400/10 border border-amber-400/30'
    default: return 'bg-white/[0.02] border border-white/[0.04]'
  }
}

const getPriorityColor = (priority: NotificationPriority): string => {
  switch (priority) {
    case 'critical': return 'text-red-400'
    case 'high': return 'text-amber-400'
    case 'medium': return 'text-blue-400'
    case 'low': return 'text-gray-500'
    default: return 'text-white/70'
  }
}

const getPriorityBorderColor = (priority: NotificationPriority): string => {
  switch (priority) {
    case 'critical': return 'border-l-red-500'
    case 'high': return 'border-l-amber-500'
    case 'medium': return 'border-l-blue-500'
    case 'low': return 'border-l-gray-500'
    default: return 'border-l-white/30'
  }
}

const getPriorityBadgeColor = (priority: NotificationPriority): string => {
  switch (priority) {
    case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30'
    case 'high': return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    case 'medium': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    case 'low': return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    default: return 'bg-white/[0.05] text-white/70'
  }
}

// ============================================================================
// HELPERS
// ============================================================================

const getRelativeTime = (timestamp: string): string => {
  const now = new Date()
  const date = new Date(timestamp)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ============================================================================
// NOTIFICATION BUILDER
// ============================================================================

function buildNotifications(): Notification[] {
  const notifications: Notification[] = []

  // 1. CIE DECAY ALERTS (critical/high priority)
  const decayAlerts = getDecayAlerts()
  decayAlerts.forEach((decay) => {
    const priority = decay.status === 'cooling' ? 'high' : 'critical'
    notifications.push({
      id: `cie-decay-${decay.clientId}`,
      source: 'CIE',
      priority,
      title: `Client Engagement Decay: ${decay.status.charAt(0).toUpperCase() + decay.status.slice(1)}`,
      description: `${decay.daysSinceContact} days since last contact. Current velocity: ${decay.currentVelocity.toFixed(1)} signals/week.`,
      clientId: decay.clientId,
      timestamp: new Date(new Date().getTime() - decay.daysSinceContact * 86400000).toISOString(),
      category: 'Decay Alert',
    })
  })

  // 2. CIE HOT PREDICTIONS (high priority)
  const hotPredictions = getHotPredictions()
  hotPredictions.slice(0, 8).forEach((pred) => {
    notifications.push({
      id: `cie-pred-${pred.clientId}-${pred.pattern}`,
      source: 'CIE',
      priority: 'high',
      title: `Prediction: ${pred.pattern}`,
      description: `Confidence: ${pred.confidence}%. ${pred.description}`,
      clientId: pred.clientId,
      timestamp: pred.detectedAt,
      category: 'AI Prediction',
    })
  })

  // 3. CIE OVERDUE CLIENTS (high priority)
  const overdueClients = getOverdueClients()
  overdueClients.forEach((overdue) => {
    notifications.push({
      id: `cie-overdue-${overdue.client.id}`,
      source: 'CIE',
      priority: 'high',
      title: `Overdue Follow-up`,
      description: `${overdue.touch.reason} - ${overdue.daysOverdue} days overdue. Scheduled for ${new Date(overdue.touch.date).toLocaleDateString()}.`,
      clientId: overdue.client.id,
      timestamp: overdue.touch.date,
      category: 'Overdue',
    })
  })

  // 4. SCOUT HIGH-URGENCY INTEL (high/medium priority)
  const highUrgencyIntel = intelFeed.filter((item) => item.urgency === 'High')
  const mediumIntel = intelFeed.filter((item) => item.urgency === 'Medium').slice(0, 3)

  highUrgencyIntel.forEach((intel) => {
    notifications.push({
      id: `scout-intel-${intel.id}`,
      source: 'SCOUT',
      priority: 'high',
      title: intel.headline,
      description: intel.description,
      clientId: intel.relevantClientIds[0],
      timestamp: intel.timestamp,
      category: `Market: ${intel.type}`,
    })
  })

  mediumIntel.forEach((intel) => {
    notifications.push({
      id: `scout-intel-${intel.id}`,
      source: 'SCOUT',
      priority: 'medium',
      title: intel.headline,
      description: intel.description,
      clientId: intel.relevantClientIds[0],
      timestamp: intel.timestamp,
      category: `Market: ${intel.type}`,
    })
  })

  // 5. ENGINE A+ MATCHES (high priority)
  const aPlusMatches = engineMatches.filter((m) => m.grade === 'A+')
  aPlusMatches.forEach((match) => {
    notifications.push({
      id: `engine-match-${match.id}`,
      source: 'ENGINE',
      priority: 'high',
      title: `New A+ Match Found`,
      description: `Outstanding match identified. Purpose: ${match.purpose}. Score: ${match.overallScore}/100.`,
      clientId: match.clientId,
      timestamp: match.createdAt,
      category: 'Property Match',
    })
  })

  // 6. FORGE CRITICAL ACTIONS (critical priority)
  const criticalActions = getCriticalActions()
  criticalActions.forEach((action) => {
    notifications.push({
      id: `forge-critical-${action.id}`,
      source: 'FORGE',
      priority: 'critical',
      title: action.title,
      description: action.description,
      clientId: action.clientId,
      timestamp: action.createdAt,
      category: action.category.toUpperCase().replace('-', ' '),
    })
  })

  // 7. FORGE OVERDUE LIFECYCLE ACTIONS (high priority)
  const overdueActions = getOverdueLifecycleActions()
  overdueActions.forEach((action) => {
    notifications.push({
      id: `forge-lifecycle-${action.id}`,
      source: 'FORGE',
      priority: 'high',
      title: action.title,
      description: `${action.actionType.replace(/-/g, ' ')}: ${action.description}`,
      clientId: action.clientId,
      timestamp: action.dueDate,
      category: action.phase,
    })
  })

  return notifications
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function NotificationsCentreView(): React.ReactElement {
  const { openClient } = useWorkspaceNav()
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>(null)
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>(null)

  const allNotifications = useMemo(() => buildNotifications(), [])

  const filtered = useMemo(() => {
    let result = [...allNotifications]

    if (priorityFilter) {
      result = result.filter((n) => n.priority === priorityFilter)
    }

    if (sourceFilter) {
      result = result.filter((n) => n.source === sourceFilter)
    }

    // Sort by priority (critical first) then by timestamp (newest first)
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    result.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
      if (priorityDiff !== 0) return priorityDiff
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    })

    return result
  }, [allNotifications, priorityFilter, sourceFilter])

  const stats = useMemo(() => {
    const criticalCount = allNotifications.filter((n) => n.priority === 'critical').length
    const highCount = allNotifications.filter((n) => n.priority === 'high').length
    const cieCount = allNotifications.filter((n) => n.source === 'CIE').length
    const forgeCount = allNotifications.filter((n) => n.source === 'FORGE').length

    return {
      total: allNotifications.length,
      critical: criticalCount,
      high: highCount,
      cie: cieCount,
      forge: forgeCount,
    }
  }, [allNotifications])

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0 pb-3 border-b border-pcis-border/10">
        <div>
          <h2
            className="text-lg font-semibold text-pcis-text tracking-tight"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Notifications Centre
          </h2>
          <p className="text-[10px] text-pcis-text-muted tracking-wider uppercase mt-0.5">
            Unified Alerts · All Engines
          </p>
        </div>
      </div>

      {/* Top Stats Bar */}
      <div className="flex-shrink-0 py-3 border-b border-pcis-border/10 grid grid-cols-5 gap-4 px-0">
        <div className="text-center">
          <span className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider block">Total Alerts</span>
          <span className="text-[11px] font-bold text-white/90 block mt-0.5 tabular-nums">
            {stats.total}
          </span>
        </div>

        <div className="text-center">
          <span className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider block">Critical</span>
          <span className={`text-[11px] font-bold block mt-0.5 tabular-nums ${stats.critical > 0 ? 'text-red-400' : 'text-white/50'}`}>
            {stats.critical}
          </span>
        </div>

        <div className="text-center">
          <span className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider block">High</span>
          <span className={`text-[11px] font-bold block mt-0.5 tabular-nums ${stats.high > 0 ? 'text-amber-400' : 'text-white/50'}`}>
            {stats.high}
          </span>
        </div>

        <div className="text-center">
          <span className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider block">CIE Alerts</span>
          <span className="text-[11px] font-bold text-pcis-gold block mt-0.5 tabular-nums">
            {stats.cie}
          </span>
        </div>

        <div className="text-center">
          <span className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider block">FORGE Alerts</span>
          <span className="text-[11px] font-bold text-pcis-gold block mt-0.5 tabular-nums">
            {stats.forge}
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex-shrink-0 py-3 border-b border-pcis-border/10 space-y-2">
        {/* Priority Filter */}
        <div className="flex items-center gap-2">
          <span className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider w-20">Priority</span>
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setPriorityFilter(null)}
              className={`px-2.5 py-1 text-[9px] font-medium uppercase tracking-wider rounded transition-all ${
                priorityFilter === null
                  ? 'bg-pcis-gold/20 text-pcis-gold border border-pcis-gold/50'
                  : 'bg-white/[0.02] text-white/70 border border-white/[0.04] hover:bg-white/[0.04]'
              }`}
            >
              All
            </button>
            {(['critical', 'high', 'medium', 'low'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className={`px-2.5 py-1 text-[9px] font-medium uppercase tracking-wider rounded transition-all ${
                  priorityFilter === p
                    ? `border ${getPriorityBadgeColor(p)}`
                    : 'bg-white/[0.02] text-white/70 border border-white/[0.04] hover:bg-white/[0.04]'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Source Filter */}
        <div className="flex items-center gap-2">
          <span className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider w-20">Source</span>
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setSourceFilter(null)}
              className={`px-2.5 py-1 text-[9px] font-medium uppercase tracking-wider rounded transition-all ${
                sourceFilter === null
                  ? 'bg-pcis-gold/20 text-pcis-gold border border-pcis-gold/50'
                  : 'bg-white/[0.02] text-white/70 border border-white/[0.04] hover:bg-white/[0.04]'
              }`}
            >
              All
            </button>
            {(['CIE', 'SCOUT', 'ENGINE', 'FORGE'] as const).map((src) => (
              <button
                key={src}
                onClick={() => setSourceFilter(src)}
                className={`px-2.5 py-1 text-[9px] font-medium uppercase tracking-wider rounded transition-all ${
                  sourceFilter === src
                    ? `border border-white/30 ${getSourceColor(src)}`
                    : 'bg-white/[0.02] text-white/70 border border-white/[0.04] hover:bg-white/[0.04]'
                }`}
              >
                {src}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Notifications Feed */}
      <div className="flex-1 overflow-y-auto min-h-0 py-3 pr-2">
        <div className="space-y-2.5">
          {filtered.map((notification) => (
            <div
              key={notification.id}
              className={`bg-white/[0.02] border border-white/[0.04] rounded-lg p-3 space-y-2.5 group hover:border-white/[0.08] transition-all border-l-4 ${getPriorityBorderColor(notification.priority)}`}
            >
              {/* Header Row: Source Badge + Title */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className={`px-2 py-1 text-[8px] font-bold uppercase tracking-wider rounded ${getSourceBgColor(notification.source)} flex-shrink-0`}>
                    {notification.source}
                  </span>
                  <p className="text-[10px] font-semibold text-white/90 leading-tight truncate">
                    {notification.title}
                  </p>
                </div>
                <span className={`px-2 py-1 text-[8px] font-bold uppercase tracking-wider rounded flex-shrink-0 ${getPriorityBadgeColor(notification.priority)}`}>
                  {notification.priority}
                </span>
              </div>

              {/* Description */}
              <p className="text-[9px] text-white/70 leading-relaxed">
                {notification.description}
              </p>

              {/* Footer Row: Client Link + Category + Timestamp */}
              <div className="flex items-center justify-between pt-1 text-[8px]">
                <div className="flex items-center gap-2">
                  {notification.clientId && (
                    <div
                      className="cursor-pointer hover:text-pcis-gold transition-colors"
                      onClick={() => openClient(notification.clientId!)}
                    >
                      <ClientLink clientId={notification.clientId} className="text-white/60 hover:text-pcis-gold no-underline hover:underline">
                        View Client
                      </ClientLink>
                    </div>
                  )}
                  <span className="text-white/40 uppercase tracking-wider">
                    {notification.category}
                  </span>
                </div>
                <span className="text-white/40 uppercase tracking-wider flex-shrink-0">
                  {getRelativeTime(notification.timestamp)}
                </span>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-2">
                <p className="text-white/40 text-[10px] uppercase tracking-wider">No notifications match filters</p>
                <p className="text-white/20 text-[9px]">Try adjusting your selection</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary Footer */}
      {filtered.length > 0 && (
        <div className="flex-shrink-0 border-t border-pcis-border/10 pt-3 px-0 flex items-center justify-between text-[8px] text-white/50">
          <div className="flex gap-6">
            <div>
              <span className="text-white/40 uppercase tracking-wider block text-[7px]">Showing</span>
              <span className="text-white/90 font-semibold text-[10px]">{filtered.length} Alerts</span>
            </div>
            <div>
              <span className="text-white/40 uppercase tracking-wider block text-[7px]">By Source</span>
              <span className="text-white/90 font-semibold text-[10px]">
                {allNotifications.filter((n) => n.source === 'CIE').length} CIE · {allNotifications.filter((n) => n.source === 'SCOUT').length} SCOUT · {allNotifications.filter((n) => n.source === 'ENGINE').length} ENGINE
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="text-right">
              <span className="text-white/40 uppercase tracking-wider block text-[7px]">Critical</span>
              <span className="text-red-400 font-semibold text-[10px]">{stats.critical}</span>
            </div>
            <div className="text-right">
              <span className="text-white/40 uppercase tracking-wider block text-[7px]">High</span>
              <span className="text-amber-400 font-semibold text-[10px]">{stats.high}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
