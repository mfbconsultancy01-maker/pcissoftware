'use client'

import React, { Suspense, lazy } from 'react'
import { Panel, PanelType } from './WorkspaceProvider'

// ============================================================================
// PCIS Panel Renderer
// ============================================================================
// Maps panel types to their components. Detail panels (client-detail,
// match-detail, property-detail) use workspace-native views with context
// linking. List panels use workspace-aware views with clickable items.
// Other panels use the existing page components.
// ============================================================================

// Workspace-native panels (context-aware, clickable, designed for tiling)
import ClientDetailView from './panels/ClientDetailView'
import MatchDetailView from './panels/MatchDetailView'
import PropertyDetailView from './panels/PropertyDetailView'
import ClientsListView from './panels/ClientsListView'
import MatchesListView from './panels/MatchesListView'
import AreaGridView from './panels/AreaGridView'
import AreaProfileView from './panels/AreaProfileView'
import TransactionFeedView from './panels/TransactionFeedView'
import TransactionDetailView from './panels/TransactionDetailView'
import VolumeAnalysisView from './panels/VolumeAnalysisView'
import BuyerDemographicsView from './panels/BuyerDemographicsView'
import TopTransactionsView from './panels/TopTransactionsView'
import BuildingAnalyticsView from './panels/BuildingAnalyticsView'
import PriceMapView from './panels/PriceMapView'
import ComparablesView from './panels/ComparablesView'
import PriceTrendsView from './panels/PriceTrendsView'
import ValuationMatrixView from './panels/ValuationMatrixView'
import PriceAlertsView from './panels/PriceAlertsView'
import OffPlanFeedView from './panels/OffPlanFeedView'
import OffPlanDetailView from './panels/OffPlanDetailView'
import DeveloperAnalyticsView from './panels/DeveloperAnalyticsView'
import PaymentPlansView from './panels/PaymentPlansView'
import LaunchMonitorView from './panels/LaunchMonitorView'
import MacroDashboardView from './panels/MacroDashboardView'
import VisaPopulationView from './panels/VisaPopulationView'
import EconomicIndicatorsView from './panels/EconomicIndicatorsView'
import RegulatoryTrackerView from './panels/RegulatoryTrackerView'
import TourismDemandView from './panels/TourismDemandView'
import SignalFeedView from './panels/SignalFeedView'
import OpportunityRadarView from './panels/OpportunityRadarView'
import EmergingAreasView from './panels/EmergingAreasView'
import HeatMapView from './panels/HeatMapView'
import MarketPulseView from './panels/MarketPulseView'
import CIEDashboardView from './panels/CIEDashboardView'
import CIEProfileView from './panels/CIEProfileView'
import CIESignalsView from './panels/CIESignalsView'
import CIEComparatorView from './panels/CIEComparatorView'
import CIEEngagementView from './panels/CIEEngagementView'
import CIEPredictionsView from './panels/CIEPredictionsView'
import CIEMapView from './panels/CIEMapView'
import CIEGridView from './panels/CIEGridView'
import CIEPipelineView from './panels/CIEPipelineView'
import ENGDashboardView from './panels/ENGDashboardView'
import ENGPurposeMatrixView from './panels/ENGPurposeMatrixView'
import ENGMatchScorerView from './panels/ENGMatchScorerView'
import ENGRecommendationsView from './panels/ENGRecommendationsView'
import ENGClientPropertyGridView from './panels/ENGClientPropertyGridView'
import ENGPurposeTrendsView from './panels/ENGPurposeTrendsView'
import FORGEDashboardView from './panels/FORGEDashboardView'
import FORGEDealBriefView from './panels/FORGEDealBriefView'
import FORGEProposalView from './panels/FORGEProposalView'
import FORGECommAdvisorView from './panels/FORGECommAdvisorView'
import FORGELifecycleView from './panels/FORGELifecycleView'
import FORGEActivityLogView from './panels/FORGEActivityLogView'
import FORGEClientDossierView from './panels/FORGEClientDossierView'
import FORGEDealRoomView from './panels/FORGEDealRoomView'
import FORGEMeetingPrepView from './panels/FORGEMeetingPrepView'
import FORGEOpportunityRadarView from './panels/FORGEOpportunityRadarView'
import FORGEDashboardNewView from './panels/FORGEDashboardNewView'
import FORGEClientDossierNewView from './panels/FORGEClientDossierNewView'
import SCOUTDashboardView from './panels/SCOUTDashboardView'
import NewsView from './panels/NewsView'
import Client360View from './panels/Client360View'
import PipelineView from './panels/PipelineView'
import NotificationsCentreView from './panels/NotificationsCentreView'
import CommandCentreView from './panels/CommandCentreView'

// Lazy-load existing page components for panels that haven't been converted yet
const DashboardPage = lazy(() => import('@/app/dashboard/page'))
const IntelPage = lazy(() => import('@/app/intel/page'))
const PredictionsPage = lazy(() => import('@/app/predictions/page'))
const RelationshipsPage = lazy(() => import('@/app/relationships/page'))
const RecommendationsPage = lazy(() => import('@/app/recommendations/page'))
const ReportsPage = lazy(() => import('@/app/reports/page'))
const PerformancePage = lazy(() => import('@/app/performance/page'))
const PropertiesPage = lazy(() => import('@/app/properties/page'))
const SettingsPage = lazy(() => import('@/app/settings/page'))
const MorningBriefPage = lazy(() => import('@/app/dashboard/page'))

// ---------------------------------------------------------------------------
// Loading Skeleton
// ---------------------------------------------------------------------------

function PanelSkeleton() {
  return (
    <div className="h-full w-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-pcis-gold/30 border-t-pcis-gold rounded-full animate-spin" />
        <span className="text-[10px] text-pcis-text-muted tracking-wider uppercase">Loading</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Panel Content Wrapper
// ---------------------------------------------------------------------------

function PanelContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full overflow-y-auto overflow-x-hidden p-4">
      <Suspense fallback={<PanelSkeleton />}>
        {children}
      </Suspense>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Legacy page components (will gradually be replaced with workspace-native)
// ---------------------------------------------------------------------------

const LEGACY_PANELS: Partial<Record<PanelType, React.ComponentType<any>>> = {
  'dashboard': DashboardPage,
  'intel': IntelPage,
  'predictions': PredictionsPage,
  'relationships': RelationshipsPage,
  'recommendations': RecommendationsPage,
  'reports': ReportsPage,
  'performance': PerformancePage,
  'properties': PropertiesPage,
  'settings': SettingsPage,
  'morning-brief': MorningBriefPage,
}

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------

export default function PanelRenderer({ panel }: { panel: Panel }) {

  // ---- Workspace-native detail panels (context-aware) ----
  if (panel.type === 'client-detail' && panel.entityId) {
    return (
      <PanelContent>
        <ClientDetailView entityId={panel.entityId} />
      </PanelContent>
    )
  }

  if (panel.type === 'match-detail' && panel.entityId) {
    return (
      <PanelContent>
        <MatchDetailView entityId={panel.entityId} />
      </PanelContent>
    )
  }

  if (panel.type === 'property-detail' && panel.entityId) {
    return (
      <PanelContent>
        <PropertyDetailView entityId={panel.entityId} />
      </PanelContent>
    )
  }

  // ---- Area Intelligence panels ----
  if (panel.type === 'area-grid') {
    return (
      <PanelContent>
        <AreaGridView />
      </PanelContent>
    )
  }

  if (panel.type === 'area-profile' && panel.entityId) {
    return (
      <PanelContent>
        <AreaProfileView entityId={panel.entityId} />
      </PanelContent>
    )
  }

  // ---- Transaction Intelligence panels ----
  if (panel.type === 'transaction-feed') {
    return (
      <PanelContent>
        <TransactionFeedView />
      </PanelContent>
    )
  }

  if (panel.type === 'transaction-detail' && panel.entityId) {
    return (
      <PanelContent>
        <TransactionDetailView entityId={panel.entityId} />
      </PanelContent>
    )
  }

  if (panel.type === 'volume-analysis') {
    return (
      <PanelContent>
        <VolumeAnalysisView />
      </PanelContent>
    )
  }

  if (panel.type === 'buyer-demographics') {
    return (
      <PanelContent>
        <BuyerDemographicsView />
      </PanelContent>
    )
  }

  if (panel.type === 'top-transactions') {
    return (
      <PanelContent>
        <TopTransactionsView />
      </PanelContent>
    )
  }

  if (panel.type === 'building-analytics') {
    return (
      <PanelContent>
        <BuildingAnalyticsView />
      </PanelContent>
    )
  }

  // ---- Price Intelligence panels ----
  if (panel.type === 'price-map') {
    return (
      <PanelContent>
        <PriceMapView />
      </PanelContent>
    )
  }

  if (panel.type === 'comparables') {
    return (
      <PanelContent>
        <ComparablesView />
      </PanelContent>
    )
  }

  if (panel.type === 'price-trends') {
    return (
      <PanelContent>
        <PriceTrendsView />
      </PanelContent>
    )
  }

  if (panel.type === 'valuation-matrix') {
    return (
      <PanelContent>
        <ValuationMatrixView />
      </PanelContent>
    )
  }

  if (panel.type === 'price-alerts') {
    return (
      <PanelContent>
        <PriceAlertsView />
      </PanelContent>
    )
  }

  // ---- Off-Plan Intelligence panels ----
  if (panel.type === 'offplan-feed') {
    return (
      <PanelContent>
        <OffPlanFeedView />
      </PanelContent>
    )
  }

  if (panel.type === 'offplan-detail' && panel.entityId) {
    return (
      <PanelContent>
        <OffPlanDetailView entityId={panel.entityId} />
      </PanelContent>
    )
  }

  if (panel.type === 'developer-analytics') {
    return (
      <PanelContent>
        <DeveloperAnalyticsView />
      </PanelContent>
    )
  }

  if (panel.type === 'payment-plans') {
    return (
      <PanelContent>
        <PaymentPlansView />
      </PanelContent>
    )
  }

  if (panel.type === 'launch-monitor') {
    return (
      <PanelContent>
        <LaunchMonitorView />
      </PanelContent>
    )
  }

  // ---- Macro Intelligence panels ----
  if (panel.type === 'macro-dashboard') {
    return (
      <PanelContent>
        <MacroDashboardView />
      </PanelContent>
    )
  }

  if (panel.type === 'visa-population') {
    return (
      <PanelContent>
        <VisaPopulationView />
      </PanelContent>
    )
  }

  if (panel.type === 'economic-indicators') {
    return (
      <PanelContent>
        <EconomicIndicatorsView />
      </PanelContent>
    )
  }

  if (panel.type === 'regulatory-tracker') {
    return (
      <PanelContent>
        <RegulatoryTrackerView />
      </PanelContent>
    )
  }

  if (panel.type === 'tourism-demand') {
    return (
      <PanelContent>
        <TourismDemandView />
      </PanelContent>
    )
  }

  // ---- Market Signals panels ----
  if (panel.type === 'signal-feed') {
    return (
      <PanelContent>
        <SignalFeedView />
      </PanelContent>
    )
  }

  if (panel.type === 'opportunity-radar') {
    return (
      <PanelContent>
        <OpportunityRadarView />
      </PanelContent>
    )
  }

  if (panel.type === 'emerging-areas') {
    return (
      <PanelContent>
        <EmergingAreasView />
      </PanelContent>
    )
  }

  if (panel.type === 'heat-map') {
    return (
      <PanelContent>
        <HeatMapView />
      </PanelContent>
    )
  }

  if (panel.type === 'market-pulse') {
    return (
      <PanelContent>
        <MarketPulseView />
      </PanelContent>
    )
  }

  // ---- CIE Engine panels ----
  if (panel.type === 'cie-dashboard') {
    return (
      <PanelContent>
        <CIEDashboardView />
      </PanelContent>
    )
  }

  if (panel.type === 'cie-profile') {
    return (
      <PanelContent>
        <CIEProfileView entityId={panel.entityId || ''} />
      </PanelContent>
    )
  }

  if (panel.type === 'cie-signals') {
    return (
      <PanelContent>
        <CIESignalsView />
      </PanelContent>
    )
  }

  if (panel.type === 'cie-comparator') {
    return (
      <PanelContent>
        <CIEComparatorView />
      </PanelContent>
    )
  }

  if (panel.type === 'cie-engagement') {
    return (
      <PanelContent>
        <CIEEngagementView />
      </PanelContent>
    )
  }

  if (panel.type === 'cie-predictions') {
    return (
      <PanelContent>
        <CIEPredictionsView />
      </PanelContent>
    )
  }

  if (panel.type === 'cie-map') {
    return (
      <PanelContent>
        <CIEMapView />
      </PanelContent>
    )
  }

  if (panel.type === 'cie-grid') {
    return (
      <PanelContent>
        <CIEGridView />
      </PanelContent>
    )
  }

  if (panel.type === 'prediction-intelligence') {
    return (
      <PanelContent>
        <PredictionsPage />
      </PanelContent>
    )
  }

  if (panel.type === 'relationship-intelligence') {
    return (
      <PanelContent>
        <div className="flex items-center justify-center h-full">
          <div className="text-center space-y-4 max-w-md">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <span className="text-2xl font-mono font-bold text-cyan-400">RLI</span>
            </div>
            <h2 className="text-lg font-semibold text-white/90">Relationship Intelligence</h2>
            <p className="text-[11px] text-white/50 leading-relaxed">
              Cross-client relationship mapping, network analysis and influence tracking.
              Discover hidden connections between clients, identify referral opportunities,
              and map influence networks across your entire book.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-pcis-gold/10 border border-pcis-gold/20">
              <span className="text-[10px] font-mono font-bold text-pcis-gold uppercase tracking-widest">Coming Soon</span>
            </div>
          </div>
        </div>
      </PanelContent>
    )
  }

  if (panel.type === 'cie-pipeline') {
    return (
      <PanelContent>
        <CIEPipelineView />
      </PanelContent>
    )
  }

  // ---- ENGINE panels ----
  if (panel.type === 'engine-dashboard') {
    return (
      <PanelContent>
        <ENGDashboardView />
      </PanelContent>
    )
  }

  if (panel.type === 'engine-purpose-matrix') {
    return (
      <PanelContent>
        <ENGPurposeMatrixView />
      </PanelContent>
    )
  }

  if (panel.type === 'engine-match-scorer') {
    return (
      <PanelContent>
        <ENGMatchScorerView />
      </PanelContent>
    )
  }

  if (panel.type === 'engine-recommendations') {
    return (
      <PanelContent>
        <ENGRecommendationsView />
      </PanelContent>
    )
  }

  if (panel.type === 'engine-client-property') {
    return (
      <PanelContent>
        <ENGClientPropertyGridView />
      </PanelContent>
    )
  }

  if (panel.type === 'engine-purpose-trends') {
    return (
      <PanelContent>
        <ENGPurposeTrendsView />
      </PanelContent>
    )
  }

  // ---- FORGE panels (NEW -- Claude-powered) ----
  if (panel.type === 'forge-dashboard') {
    return (
      <PanelContent>
        <FORGEDashboardView />
      </PanelContent>
    )
  }

  if (panel.type === 'forge-deal-room') {
    return (
      <PanelContent>
        <FORGEDealRoomView />
      </PanelContent>
    )
  }

  if (panel.type === 'forge-meeting-prep') {
    return (
      <PanelContent>
        <FORGEMeetingPrepView />
      </PanelContent>
    )
  }

  if (panel.type === 'forge-opportunity-radar') {
    return (
      <PanelContent>
        <FORGEOpportunityRadarView />
      </PanelContent>
    )
  }

  if (panel.type === 'forge-client-dossier') {
    return (
      <PanelContent>
        <FORGEClientDossierNewView />
      </PanelContent>
    )
  }

  // ---- FORGE legacy panels (kept for backward compatibility) ----
  if (panel.type === 'forge-deal-brief') {
    return (
      <PanelContent>
        <FORGEDealBriefView />
      </PanelContent>
    )
  }

  if (panel.type === 'forge-proposal') {
    return (
      <PanelContent>
        <FORGEProposalView />
      </PanelContent>
    )
  }

  if (panel.type === 'forge-comm-advisor') {
    return (
      <PanelContent>
        <FORGECommAdvisorView />
      </PanelContent>
    )
  }

  if (panel.type === 'forge-lifecycle') {
    return (
      <PanelContent>
        <FORGELifecycleView />
      </PanelContent>
    )
  }

  if (panel.type === 'forge-activity-log') {
    return (
      <PanelContent>
        <FORGEActivityLogView />
      </PanelContent>
    )
  }

  // ---- Cross-Engine panels ----
  if (panel.type === 'scout-dashboard') {
    return (
      <PanelContent>
        <SCOUTDashboardView />
      </PanelContent>
    )
  }

  if (panel.type === 'news-feed') {
    return (
      <PanelContent>
        <NewsView />
      </PanelContent>
    )
  }

  if (panel.type === 'client-360') {
    return (
      <PanelContent>
        <Client360View entityId={panel.entityId} />
      </PanelContent>
    )
  }

  if (panel.type === 'pipeline') {
    return (
      <PanelContent>
        <PipelineView />
      </PanelContent>
    )
  }

  if (panel.type === 'command-centre') {
    return (
      <PanelContent>
        <CommandCentreView />
      </PanelContent>
    )
  }

  if (panel.type === 'notifications') {
    return (
      <PanelContent>
        <NotificationsCentreView />
      </PanelContent>
    )
  }

  // ---- Workspace-native list panels (clickable items) ----
  if (panel.type === 'clients') {
    return (
      <PanelContent>
        <ClientsListView />
      </PanelContent>
    )
  }

  if (panel.type === 'matches') {
    return (
      <PanelContent>
        <MatchesListView />
      </PanelContent>
    )
  }

  // ---- Legacy page panels ----
  const LegacyComponent = LEGACY_PANELS[panel.type]
  if (LegacyComponent) {
    return (
      <PanelContent>
        <LegacyComponent />
      </PanelContent>
    )
  }

  // ---- Fallback ----
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <span className="text-2xl text-pcis-text-muted/20 block mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
          {panel.icon}
        </span>
        <span className="text-[10px] text-pcis-text-muted tracking-wider">Panel not found</span>
      </div>
    </div>
  )
}
