'use client'

import { useCallback } from 'react'
import { useWorkspace, PanelType, PANEL_REGISTRY } from './WorkspaceProvider'
import {
  getClient, getProperty, getMatchStage,
} from '@/lib/mockData'
import { areas } from '@/lib/marketData'

// ============================================================================
// PCIS Workspace Navigation Hook
// ============================================================================
// Provides context-aware navigation for any component inside a panel.
// Import this hook to make any clickable element open a detail panel.
//
// Usage:
//   const nav = useWorkspaceNav()
//   <button onClick={() => nav.openClient('c1')}>Al Maktoum</button>
//   <button onClick={() => nav.openMatch('m1')}>Match A+</button>
//   <button onClick={() => nav.openProperty('p1')}>Palm Villa</button>
// ============================================================================

export function useWorkspaceNav() {
  const { openPanel } = useWorkspace()

  const openClient = useCallback((clientId: string) => {
    const client = getClient(clientId)
    openPanel('client-detail', 'split-right', clientId)
  }, [openPanel])

  const openMatch = useCallback((matchId: string) => {
    openPanel('match-detail', 'split-right', matchId)
  }, [openPanel])

  const openProperty = useCallback((propertyId: string) => {
    openPanel('property-detail', 'split-right', propertyId)
  }, [openPanel])

  const openClientAsTab = useCallback((clientId: string) => {
    openPanel('client-detail', 'tab', clientId)
  }, [openPanel])

  const openMatchAsTab = useCallback((matchId: string) => {
    openPanel('match-detail', 'tab', matchId)
  }, [openPanel])

  const openPropertyAsTab = useCallback((propertyId: string) => {
    openPanel('property-detail', 'tab', propertyId)
  }, [openPanel])

  const openArea = useCallback((areaId: string) => {
    openPanel('area-profile', 'split-right', areaId)
  }, [openPanel])

  const openAreaAsTab = useCallback((areaId: string) => {
    openPanel('area-profile', 'tab', areaId)
  }, [openPanel])

  const openAreaGrid = useCallback(() => {
    openPanel('area-grid', 'tab')
  }, [openPanel])

  const openTransaction = useCallback((txnId: string) => {
    openPanel('transaction-detail', 'split-right', txnId)
  }, [openPanel])

  const openTransactionAsTab = useCallback((txnId: string) => {
    openPanel('transaction-detail', 'tab', txnId)
  }, [openPanel])

  const openTransactionFeed = useCallback(() => {
    openPanel('transaction-feed', 'tab')
  }, [openPanel])

  const openBuilding = useCallback((building: string) => {
    openPanel('building-analytics', 'split-right', building)
  }, [openPanel])

  const openProject = useCallback((projectId: string) => {
    openPanel('offplan-detail', 'split-right', projectId)
  }, [openPanel])

  const openProjectAsTab = useCallback((projectId: string) => {
    openPanel('offplan-detail', 'tab', projectId)
  }, [openPanel])

  const openOffPlanFeed = useCallback(() => {
    openPanel('offplan-feed', 'tab')
  }, [openPanel])

  const openValuationMatrix = useCallback(() => {
    openPanel('valuation-matrix', 'tab')
  }, [openPanel])

  const openPanelByType = useCallback((type: PanelType, target: 'tab' | 'split-right' = 'tab') => {
    openPanel(type, target)
  }, [openPanel])

  // CIE Engine navigation
  const openCIEDashboard = useCallback(() => {
    openPanel('cie-dashboard', 'tab')
  }, [openPanel])

  const openCIEProfileList = useCallback(() => {
    openPanel('cie-profile', 'tab')
  }, [openPanel])

  const openCIEProfile = useCallback((clientId: string) => {
    openPanel('cie-profile', 'split-right', clientId)
  }, [openPanel])

  const openCIEProfileAsTab = useCallback((clientId: string) => {
    openPanel('cie-profile', 'tab', clientId)
  }, [openPanel])

  const openCIESignals = useCallback(() => {
    openPanel('cie-signals', 'tab')
  }, [openPanel])

  const openCIEComparator = useCallback(() => {
    openPanel('cie-comparator', 'tab')
  }, [openPanel])

  const openCIEEngagement = useCallback(() => {
    openPanel('cie-engagement', 'tab')
  }, [openPanel])

  const openCIEPredictions = useCallback(() => {
    openPanel('cie-predictions', 'tab')
  }, [openPanel])

  const openCIEMap = useCallback(() => {
    openPanel('cie-map', 'tab')
  }, [openPanel])

  const openCIEGrid = useCallback(() => {
    openPanel('cie-grid', 'tab')
  }, [openPanel])

  const openCIEPipeline = useCallback(() => {
    openPanel('cie-pipeline', 'tab')
  }, [openPanel])

  const openPredictionIntelligence = useCallback(() => {
    openPanel('prediction-intelligence', 'tab')
  }, [openPanel])

  const openRelationshipIntelligence = useCallback(() => {
    openPanel('relationship-intelligence', 'tab')
  }, [openPanel])

  // ENGINE navigation
  const openEngineDashboard = useCallback(() => {
    openPanel('engine-dashboard', 'tab')
  }, [openPanel])

  const openPurposeMatrix = useCallback(() => {
    openPanel('engine-purpose-matrix', 'tab')
  }, [openPanel])

  const openMatchScorer = useCallback(() => {
    openPanel('engine-match-scorer', 'tab')
  }, [openPanel])

  const openEngineRecommendations = useCallback(() => {
    openPanel('engine-recommendations', 'tab')
  }, [openPanel])

  const openClientPropertyGrid = useCallback(() => {
    openPanel('engine-client-property', 'tab')
  }, [openPanel])

  const openPurposeTrends = useCallback(() => {
    openPanel('engine-purpose-trends', 'tab')
  }, [openPanel])

  // FORGE navigation (new Claude-powered panels)
  const openForgeDashboard = useCallback(() => {
    openPanel('forge-dashboard', 'tab')
  }, [openPanel])

  const openDealRoom = useCallback(() => {
    openPanel('forge-deal-room', 'tab')
  }, [openPanel])

  const openMeetingPrep = useCallback(() => {
    openPanel('forge-meeting-prep', 'tab')
  }, [openPanel])

  const openOpportunityRadar = useCallback(() => {
    openPanel('forge-opportunity-radar', 'tab')
  }, [openPanel])

  const openClientDossier = useCallback(() => {
    openPanel('forge-client-dossier', 'tab')
  }, [openPanel])

  // FORGE legacy navigation (kept for compatibility)
  const openDealBrief = useCallback(() => {
    openPanel('forge-deal-brief', 'tab')
  }, [openPanel])

  const openProposal = useCallback(() => {
    openPanel('forge-proposal', 'tab')
  }, [openPanel])

  const openCommAdvisor = useCallback(() => {
    openPanel('forge-comm-advisor', 'tab')
  }, [openPanel])

  const openLifecycle = useCallback(() => {
    openPanel('forge-lifecycle', 'tab')
  }, [openPanel])

  const openActivityLog = useCallback(() => {
    openPanel('forge-activity-log', 'tab')
  }, [openPanel])

  // Cross-Engine navigation
  const openScoutDashboard = useCallback(() => {
    openPanel('scout-dashboard', 'tab')
  }, [openPanel])

  const openClient360 = useCallback((clientId: string) => {
    openPanel('client-360', 'split-right', clientId)
  }, [openPanel])

  const openClient360AsTab = useCallback((clientId: string) => {
    openPanel('client-360', 'tab', clientId)
  }, [openPanel])

  const openPipeline = useCallback(() => {
    openPanel('pipeline', 'tab')
  }, [openPanel])

  const openNotifications = useCallback(() => {
    openPanel('notifications', 'tab')
  }, [openPanel])

  const openCommandCentre = useCallback(() => {
    openPanel('command-centre', 'tab')
  }, [openPanel])

  const openNewsFeed = useCallback(() => {
    openPanel('news-feed', 'tab')
  }, [openPanel])

  return {
    openClient,
    openMatch,
    openProperty,
    openClientAsTab,
    openMatchAsTab,
    openPropertyAsTab,
    openArea,
    openAreaAsTab,
    openAreaGrid,
    openTransaction,
    openTransactionAsTab,
    openTransactionFeed,
    openBuilding,
    openProject,
    openProjectAsTab,
    openOffPlanFeed,
    openValuationMatrix,
    openPanelByType,
    openCIEDashboard,
    openCIEProfileList,
    openCIEProfile,
    openCIEProfileAsTab,
    openCIESignals,
    openCIEComparator,
    openCIEEngagement,
    openCIEPredictions,
    openCIEMap,
    openCIEGrid,
    openCIEPipeline,
    openPredictionIntelligence,
    openRelationshipIntelligence,
    openEngineDashboard,
    openPurposeMatrix,
    openMatchScorer,
    openEngineRecommendations,
    openClientPropertyGrid,
    openPurposeTrends,
    openForgeDashboard,
    openDealRoom,
    openMeetingPrep,
    openOpportunityRadar,
    openClientDossier,
    openDealBrief,
    openProposal,
    openCommAdvisor,
    openLifecycle,
    openActivityLog,
    openScoutDashboard,
    openClient360,
    openClient360AsTab,
    openPipeline,
    openNotifications,
    openCommandCentre,
    openNewsFeed,
  }
}

// ============================================================================
// Clickable Entity Components — drop-in replacements for plain text
// ============================================================================
// These render entity names as clickable links that open detail panels.
// Use anywhere inside the workspace to make entities interactive.
// ============================================================================

export function ClientLink({ clientId, children, className }: {
  clientId: string
  children: React.ReactNode
  className?: string
}) {
  const { openClient } = useWorkspaceNav()
  return (
    <button
      onClick={(e) => { e.stopPropagation(); openClient(clientId) }}
      className={`hover:text-pcis-gold transition-colors cursor-pointer underline decoration-pcis-gold/20 underline-offset-2 hover:decoration-pcis-gold/60 ${className || ''}`}
    >
      {children}
    </button>
  )
}

export function PropertyLink({ propertyId, children, className }: {
  propertyId: string
  children: React.ReactNode
  className?: string
}) {
  const { openProperty } = useWorkspaceNav()
  return (
    <button
      onClick={(e) => { e.stopPropagation(); openProperty(propertyId) }}
      className={`hover:text-pcis-gold transition-colors cursor-pointer underline decoration-pcis-gold/20 underline-offset-2 hover:decoration-pcis-gold/60 ${className || ''}`}
    >
      {children}
    </button>
  )
}

export function MatchLink({ matchId, children, className }: {
  matchId: string
  children: React.ReactNode
  className?: string
}) {
  const { openMatch } = useWorkspaceNav()
  return (
    <button
      onClick={(e) => { e.stopPropagation(); openMatch(matchId) }}
      className={`hover:text-pcis-gold transition-colors cursor-pointer underline decoration-pcis-gold/20 underline-offset-2 hover:decoration-pcis-gold/60 ${className || ''}`}
    >
      {children}
    </button>
  )
}

export function AreaLink({ areaId, children, className }: {
  areaId: string
  children: React.ReactNode
  className?: string
}) {
  const { openArea } = useWorkspaceNav()
  return (
    <button
      onClick={(e) => { e.stopPropagation(); openArea(areaId) }}
      className={`hover:text-pcis-gold transition-colors cursor-pointer underline decoration-pcis-gold/20 underline-offset-2 hover:decoration-pcis-gold/60 ${className || ''}`}
    >
      {children}
    </button>
  )
}
